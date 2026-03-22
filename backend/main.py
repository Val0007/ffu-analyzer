import os
import json
import logging
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
import unicodedata

from urllib.parse import unquote

import pymupdf4llm
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

env_path = load_dotenv(Path(__file__).resolve().parents[1] / ".env")
print("Looking for .env at:", env_path)
db = sqlite3.connect(Path(__file__).with_name("ffu.db"), check_same_thread=False)
dbnew=sqlite3.connect(Path(__file__).with_name("ffunew.db"), check_same_thread=False)
print(os.environ)
print("key is ",os.environ.get("OPENAI_API_KEY"))
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
data_dir = Path("data")
extract = lambda path: pymupdf4llm.to_markdown(str(path), ignore_images=True, ignore_graphics=True)



SUMMARY_PROMPT = """
You are analyzing a document from a Swedish construction tender package 
(FFU - Förfrågningsunderlag).

You do not know in advance what type of document this is. It could be:
- Administrative specifications (AF)
- Measurement and billing rules (MER/Avsteg)
- Quantity descriptions (Mängdförteckning)
- Maintenance plans (Skötselplan)
- Technical descriptions
- Legal/authority decisions
- Drawings lists (Ritningsförteckning)
- Geotechnical reports
- Environmental reports
- Safety plans (Arbetsmiljöplan)
- Lighting/electrical specifications
- Any other document type found in Swedish construction tenders

DOCUMENT FILENAME: {filename}
DOCUMENT CONTENT:
{content}

Your task is to generate a structured JSON summary that will be used to route 
user questions to the correct document. The summary must be precise enough that 
an AI can decide FROM THE SUMMARY ALONE whether this document is relevant to a 
given question — without reading the full document.

Generate a JSON object with exactly this structure:

{{
  "filename": "<the filename as given>",
  
  "document_type": "<one of: administrative_specifications | billing_rules | 
                    quantity_description | maintenance_plan | technical_description |
                    authority_decision | drawings_list | geotechnical_report | 
                    environmental_report | safety_plan | electrical_specification |
                    legal_document | reference_document | other>",
  
  "produced_by": "<organization or person who produced this document, if stated>",
  
  "revision": {{
    "version": "<revision code e.g. REV A, or null if not stated>",
    "date": "<document date in YYYY-MM-DD format, or null>",
    "supersedes": "<filename or document reference this replaces, or null>"
  }},
  
  "project": {{
    "name": "<project name if stated, or null>",
    "location": "<location if stated, or null>",
    "client": "<client/beställare if stated, or null>"
  }},
  
  "summary": "<2-3 sentences maximum. What is this document, what does it 
               cover, what is its purpose. No fluff. Be specific.>",
  
  "topics_covered": [
    "<list of specific topics this document covers>",
    "<use specific terms: e.g. tree_maintenance, penalty_clauses, 
     stump_removal_billing, archaeological_constraints, lighting_poles,
     watering_requirements, guarantee_period, procurement_rules, etc.>",
    "<be as specific as possible — not just 'maintenance' but 
     'tree_pruning_schedule' or 'meadow_mowing_requirements'>"
  ],
  
  "key_facts": [
    {{
      "fact": "<specific fact in plain English>",
      "source_section": "<exact section code or heading from document>",
      "exact_quote": "<verbatim quote from document, max 20 words, 
                      in original language>"
    }}
  ],
  
  "key_quantities": [
    {{
      "description": "<what the quantity refers to>",
      "value": "<number and unit>",
      "source_section": "<section or code>"
    }}
  ],
  
  "dates_and_deadlines": [
    {{
      "description": "<what this date refers to>",
      "date": "<date or period>",
      "source_section": "<section>"
    }}
  ],
  
  "referenced_documents": [
    {{
      "reference": "<document number or name as written in this document>",
      "description": "<what it is>",
      "relationship": "<one of: references | is_referenced_by | supersedes | 
                       superseded_by | part_of_same_package>"
    }}
  ],
  
  "risks_and_constraints": [
    {{
      "description": "<specific risk or constraint>",
      "source_section": "<section>",
      "severity": "<high | medium | low>"
    }}
  ],
  
  "use_this_document_for": [
    "<specific question type 1 — be concrete>",
    "<specific question type 2>",
    "<3-6 items maximum>"
  ],
  
  "do_not_use_for": [
    "<question type where another document would be better>",
    "<2-4 items maximum>"
  ]
}}

STRICT RULES:
1. Never invent facts. Only include what is explicitly stated in the document.
2. Exact quotes must be verbatim, max 20 words, in the original language.
3. Source sections must be exact codes or headings from the document.
4. If a field has nothing to report, use empty array [] or null.
5. key_facts: minimum 3, maximum 8. Pick the most important.
6. topics_covered: be specific. "maintenance" is bad. 
   "tree_watering_requirements" is good.
7. use_this_document_for and do_not_use_for are the most 
   critical fields for routing. Think carefully.
8. If this is a revision, the supersedes field is mandatory.
9. If the document is mostly tabular (quantities, drawings list), 
   note what categories the table covers in topics_covered.
10. summary + use_this_document_for must together be enough for 
    an AI to decide if this document is relevant to any question.

Return ONLY valid JSON. No preamble, no explanation, no markdown, 
no code blocks. Raw JSON only.
"""

@asynccontextmanager
async def lifespan(app):
    db.execute("CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY, filename TEXT, content TEXT)")
    db.commit()
    dbnew.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            filename      TEXT UNIQUE,
            summary_json  TEXT,
            document_type TEXT,
            topics        TEXT,
            revision_date TEXT,
            supersedes    TEXT,
            processed_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    dbnew.commit()

    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.mount("/files", StaticFiles(directory="data"), name="files")

@app.post("/process")
def process():
    logger.info("Processing documents...")
    db.execute("DELETE FROM documents"); db.commit()
    paths = sorted(data_dir.rglob("*.pdf"))
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(extract, path): path for path in paths}
        for future in as_completed(futures):
            path = futures[future]
            db.execute("INSERT INTO documents(filename, content) VALUES(?, ?)", (path.name, future.result())); db.commit()
            logger.info(f"Processed {path.name}")
    return {"status": "ok", "count": len(paths)}


@app.post("/chat")
def chat(body: dict):
    docs = db.execute("SELECT id, filename FROM documents ORDER BY id").fetchall()
    system = {"role": "system", "content": "You are an FFU document analyst for Swedish construction tender documents. Available documents:\n" + "\n".join(f"{doc_id}: {name}" for doc_id, name in docs) + "\nUse read_document when you need the full content of a document."}
    messages = [system, *body.get("history", []), {"role": "user", "content": body.get("message", "")}]
    tools = [{
        "type": "function",
        "function": {
            "name": "read_document",
            "description": "Read one FFU document by database id.",
            "parameters": {
                "type": "object",
                "properties": {"document_id": {"type": "integer"}},
                "required": ["document_id"],
            },
        },
    }]
    try:
        for _ in range(10):
            resp = client.chat.completions.create(model="gpt-5.4", messages=messages, tools=tools, tool_choice="auto")
            msg = resp.choices[0].message
            if not msg.tool_calls:
                return {"response": msg.content or ""}
            messages.append(msg.model_dump(exclude_none=True))
            for call in msg.tool_calls:
                args = json.loads(call.function.arguments)
                row = db.execute("SELECT content FROM documents WHERE id = ?", (args["document_id"],)).fetchone()
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": row[0] if row else "Document not found.",
                })
        return {"response": "Stopped after 10 tool iterations."}
    except Exception as e:
        return {"response": f"Error: {e}"}



def generate_summary(filename: str, content: str) -> dict:
    max_chars = 80_000
    truncated = content[:max_chars]
    if len(content) > max_chars:
        truncated += "\n\n[DOCUMENT TRUNCATED]"

    prompt = SUMMARY_PROMPT.format(filename=filename, content=truncated)

    try:
        resp = client.chat.completions.create(
            model="gpt-5.4",
            messages=[{"role": "user", "content": prompt}],
            # max_completion_tokens=1500,
            temperature=0,
        )

        raw = resp.choices[0].message.content.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        summary = json.loads(raw)
        print(summary)
        return summary

    except json.JSONDecodeError as e:
        logger.error(f"[{filename}] JSON parse failed: {e}")
        return {"error": "json_parse_failed", "filename": filename}
    except Exception as e:
        logger.error(f"[{filename}] failed: {e}")
        return {"error": str(e), "filename": filename}



def process_one(path: Path) -> dict:
    logger.info(f"Extracting {path.name}...")
    content = extract(path)

    logger.info(f"Summarising {path.name}...")
    summary = generate_summary(path.name, content)

    return {"path": path, "summary": summary}





@app.post("/summary")
def process_summary():
    dbnew.execute("DELETE FROM documents")
    dbnew.commit()

    paths = sorted(data_dir.rglob("*.pdf"))

    if not paths:
        return {"status": "no_files_found", "count": 0}

    total = len(paths)

    def generate():
        processed, failed = [], []

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(process_one, path): path for path in paths}

            for future in as_completed(futures):
                path = futures[future]
                try:
                    result = future.result()
                    s = result["summary"]

                    if "error" in s:
                        logger.error(f"[{path.name}] {s['error']}")
                        failed.append({"filename": path.name, "error": s["error"]})
                        yield f"data: {json.dumps({'status': 'failed', 'filename': path.name, 'processed': len(processed), 'failed': len(failed), 'total': total})}\n\n"
                        continue

                    dbnew.execute(
                        """
                        INSERT OR REPLACE INTO documents
                            (filename, summary_json, document_type,
                             topics, revision_date, supersedes)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            path.name,
                            json.dumps(s, ensure_ascii=False),
                            s.get("document_type", "unknown"),
                            ",".join(s.get("topics_covered", [])),
                            s.get("revision", {}).get("date") or "",
                            s.get("revision", {}).get("supersedes") or "",
                        ),
                    )
                    dbnew.commit()

                    processed.append(path.name)
                    logger.info(f"Saved {path.name}")

                    yield f"data: {json.dumps({'status': 'ok', 'filename': path.name, 'processed': len(processed), 'failed': len(failed), 'total': total})}\n\n"

                except Exception as e:
                    logger.error(f"[{path.name}] unexpected error: {e}")
                    failed.append({"filename": path.name, "error": str(e)})
                    yield f"data: {json.dumps({'status': 'failed', 'filename': path.name, 'processed': len(processed), 'failed': len(failed), 'total': total})}\n\n"

        yield f"data: {json.dumps({'status': 'done', 'processed': len(processed), 'failed': len(failed), 'total': total})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@app.post("/chatnew")
def chat_new(body: dict):
    rows = dbnew.execute(
        "SELECT filename, summary_json FROM documents ORDER BY id"
    ).fetchall()
    print("new request")
    doc_index = []
    for filename, summary_json in rows:
        try:
            s = json.loads(summary_json) if summary_json else {}
            doc_index.append({
                "filename":       filename,
                "type":           s.get("document_type"),
                "summary":        s.get("summary"),
                "use_for":        s.get("use_this_document_for", []),
                "do_not_use_for": s.get("do_not_use_for", []),
                "topics":         s.get("topics_covered", []),
                "revision":       s.get("revision", {}),
            })
        except Exception:
            doc_index.append({"filename": filename})
 
    system = {
        "role": "system",
        "content": """You are an FFU document analyst for Swedish construction tender documents.
 
Available documents:
""" + json.dumps(doc_index, ensure_ascii=False, indent=2) + """
 
ROUTING RULES:
- Use summary, use_for, and do_not_use_for to decide which documents to read.
- If two documents cover the same topic prefer the one with the later revision date.
- Read the minimum number of documents needed to answer accurately.
- If a document's do_not_use_for matches the question type, skip it.

RESPONSE FORMAT:
First write your full answer as plain text without sources.
Then on a new line write exactly: <|SOURCES|>
Then write the sources JSON array and nothing else:
[
  {
    "filename": "exact filename including .pdf",
    "quotes": [
      "VERBATIM text copied character for character from the document, in the original Swedish",
      "another VERBATIM quote in original Swedish"
    ]
  }
]

CRITICAL QUOTE RULES:
- quotes must be copied VERBATIM from the document
- quotes must be in the ORIGINAL LANGUAGE (Swedish)
- do NOT summarise or translate
- do NOT write descriptions like "This is a..."
- copy the exact Swedish text as it appears in the document
- these quotes will be used to highlight text in the PDF so they MUST match exactly
- Never repeat the same filename in sources more than once. 
  If multiple quotes come from the same file, group them under one source entry with multiple quotes.
"""
    }
 
    messages = [
        system,
        *body.get("history", []),
        {"role": "user", "content": body.get("message", "")},
    ]
 
    tools = [{
        "type": "function",
        "function": {
            "name": "read_document",
            "description": "Read the full content of a document by filename. Only call this after the summary confirms it is relevant.",
            "parameters": {
                "type": "object",
                "properties": {"filename": {"type": "string"}},
                "required": ["filename"],
            },
        },
    }]
 

    def generate():
        nonlocal messages
        print("generate() started")
        for _ in range(10):
            # let tool call finish first , stream only documents read
            resp = client.chat.completions.create(
                model="gpt-5.4",
                messages=messages,
                tools=tools,
                tool_choice="auto",
            )
            msg = resp.choices[0].message

            if not msg.tool_calls:
                break

            messages.append(msg.model_dump(exclude_none=True))
            for call in msg.tool_calls:
                args = json.loads(call.function.arguments)
                path = data_dir / args["filename"]
                try:
                    content = extract(path)
                except Exception as e:
                    content = f"Error reading file: {e}"

                # tell frontend which file is being read
                yield f"data: {json.dumps({'reading': args['filename']})}\n\n"

                messages.append({
                    "role":         "tool",
                    "tool_call_id": call.id,
                    "content":      content,
                })

        #stream the response after reading of files
        stream = client.chat.completions.create(
            model="gpt-5.4",
            messages=messages,
            stream=True,
        )

        collected = ""
        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                collected += delta.content
                yield f"data: {json.dumps({'token': delta.content})}\n\n"

        # response stream finished , send the sources as one chunk
        if '<|SOURCES|>' in collected:
            parts = collected.split('<|SOURCES|>')
            answer = parts[0].strip()
            try:
                sources = json.loads(parts[1].strip())
            except:
                 sources = []

        yield f"data: {json.dumps({'done': True, 'sources': sources})}\n\n"

    print("outside generate")
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
        )

@app.get("/getsummaries")
def get_summaries():
    rows = dbnew.execute(
        """SELECT filename, summary_json, document_type, 
           revision_date, supersedes 
           FROM documents ORDER BY id"""
    ).fetchall()
    
    result = []
    for filename, summary_json, doc_type, revision_date, supersedes in rows:
        try:
            s = json.loads(summary_json) if summary_json else {}
            result.append({
                "filename":      filename,
                "document_type": doc_type,
                "revision_date": revision_date or None,
                "supersedes":    supersedes or None,
                "summary":       s.get("summary", ""),
                "use_for":       s.get("use_this_document_for", []),
                "do_not_use_for": s.get("do_not_use_for", []),
                "topics":        s.get("topics_covered", []),
                "key_facts":     s.get("key_facts", []),
                "revision":      s.get("revision", {}),
            })
        except Exception:
            result.append({
                "filename":      filename,
                "document_type": doc_type or "unknown",
            })
    
    return result

@app.get("/document")
def search_document(filename: str):
    filename = unicodedata.normalize('NFC', unquote(filename))
    path = data_dir / filename
    content = extract(path)  # markdown text
    print(f"document requestedd: {filename}")
    try:
        content = extract(path)
        return {"filename": filename, "content": content}
    except Exception as e:
        return {"error": str(e)}
    
dist_path = "../frontend/dist"
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
