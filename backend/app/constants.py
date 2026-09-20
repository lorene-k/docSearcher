EMBEDDING_MODEL = "gemini-embedding-2"
# Matryoshka truncation: 768 keeps most of the retrieval quality at a quarter of the storage
EMBEDDING_DIMENSIONS = 768
# The embedding API caps how many texts one request may carry
EMBEDDING_BATCH_SIZE = 100
GENERATION_MODEL = "gemini-2.5-flash"
GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile"
MAX_OUTPUT_TOKENS = 500
MAX_MESSAGE_LENGTH = 8000

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
assert CHUNK_OVERLAP < CHUNK_SIZE, "CHUNK_OVERLAP must be smaller than CHUNK_SIZE or the chunking loop stalls"
MAX_PDF_PAGES = 6

SIMILARITY_HIGH = 0.75
SIMILARITY_LOW = 0.55
MATCH_CANDIDATES = 20
# PostgREST refuses to return more rows than this in one response (supabase config max_rows)
PAGE_SIZE = 1000

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"
# Supabase doesn't expose a clean refresh-token expiry in the session response;
# 30 days matches typical Supabase JWT defaults - reconcile with the actual
# project's refresh token expiry setting if it differs.
REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30
