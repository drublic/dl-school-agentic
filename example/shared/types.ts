export interface HandbookChunk {
  id: string;
  page: number;
  section: string;
  section_id: string;
  chunk_text: string;
  _note?: string;
}

export interface HandbookCorpus {
  doc: string;
  version: string;
  chunks: HandbookChunk[];
  golden_questions?: Array<{
    question: string;
    expected_chunk_id: string | null;
    expected_answer_contains: string;
  }>;
}

export interface SearchHit {
  id: string;
  text: string;
  page?: number;
  section?: string;
  section_id?: string;
  score?: number;
  count?: number;
}

export interface SearchDocumentsInput {
  query: string;
  filters?: Record<string, unknown>;
}

export interface GetDocumentByIdInput {
  id: string;
}
