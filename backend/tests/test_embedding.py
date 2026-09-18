"""Tests for batching in the embedding service."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from app.constants import EMBEDDING_BATCH_SIZE, EMBEDDING_DIMENSIONS
from app.services.embedding import embed_chunks, embed_query


def fake_embed_content(model, contents, config):
    return SimpleNamespace(embeddings=[SimpleNamespace(values=[float(len(text))]) for text in contents])


@pytest.fixture
def embed_content():
    client = MagicMock()
    client.models.embed_content.side_effect = fake_embed_content
    with patch("app.services.embedding.get_client", return_value=client):
        yield client.models.embed_content


def test_embeds_all_chunks_in_one_request(embed_content):
    assert embed_chunks(["a", "bb", "ccc"]) == [[1.0], [2.0], [3.0]]
    embed_content.assert_called_once()
    config = embed_content.call_args.kwargs["config"]
    assert (config.task_type, config.output_dimensionality) == ("RETRIEVAL_DOCUMENT", EMBEDDING_DIMENSIONS)


def test_splits_large_uploads_into_batches(embed_content):
    chunks = ["x"] * (EMBEDDING_BATCH_SIZE + 1)
    assert len(embed_chunks(chunks)) == len(chunks)
    assert embed_content.call_count == 2


def test_query_uses_the_query_task_type(embed_content):
    assert embed_query("hello") == [5.0]
    assert embed_content.call_args.kwargs["config"].task_type == "RETRIEVAL_QUERY"
