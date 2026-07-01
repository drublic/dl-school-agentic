# DL Agentic Workshop

## Setup

In your terminal do this:

### 1. Clone the repository

```bash
git clone git@github.com:drublic/dl-school-agentic.git
cd dl-school-agentic
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and add your API keys:

```bash
cp env.example .env
```

Then edit `.env` and set at least:

- `PINECONE_API_KEY`
- `OPENAI_API_KEY`

The remaining `WORKSHOP_PINECONE_*` values have sensible defaults for the workshop.
