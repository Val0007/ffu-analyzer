# FFU Analyzer

## What I Built

1. **Some context improvement**  
   The first thing I did was improve the context gpt had, it was picking files by their name, to improve this i created a summary endpoint that processes all files at first and gets their summaries, when this file should be used, key points etc  
   For example => What measurement and billing rules apply for tree felling?  
   Missed the revision difference — The expected answer specifically tested whether GPT could distinguish between the original Avsteg document and the revised version (REV A 2025-05-13). The revised version added BFC röjning and BFD.13 to the chain which the original didn't have. GPT didn't catch this distinction  
   After summaries were given to gpt before making tool calls to files themselves  
   Routed directly to 6.3 Avsteg MER Anläggning 23 rev. 2025-05-21.pdf, caught the full BFB.1 → BFD.12 → BFD.13 chain  

   **Reason**: Although this is expensive doing, this helped the context improvement and I think that matters to the user's response being more accurate

2. **Claude like Chat Interface with streaming of responses**  
   At first made the chatpanel and rendered the responses from the backend  
   Next used Streaming response from fastApi to implement streaming the responses to improve usability  
   Added sources used by gpt and quotes directly from the documents  
   See source button pulls up the source file and highlights the quotes  

   **Reason**:  
   Its important to know what's happening in the screen instead of just looking at the spinner which is why added which documents are being read by gpt.  
   Its important that users know the sources used are from the actual documentation and not from hallucination

3. **Markdown viewer with source highlighting**  
   Made a resizable markdown viewer that searches through text and highlights the verbatim quotes used by gpt  

   **Reason**: I needed something that worked quickly with strings and made it easier to highlight texts

4. **Sidebar to navigate between documents**  
   The Sidebar lists all the documents in the package  
   While hovering, it displays a tooltip that contains the summary, key points, related questions for which the file will be used  

   **Reason**: It gives context to the user as to what files are there, the kind of questions that file will be used to answer and the key points for a quick overview

## What I Would Do Next (With More Time)

- 1. **PDF VIEWER AND HIGHLIGHTER**  
  I actually spent a couple of hours on this before scraping this, it was complex to match and highlight the correct texts

- 2. **Implement better retrieval methods (e.g., chunking, embeddings, or hybrid search) instead of passing full files directly.**  
  This is something I really want to explore, this should improve the response speed