"""Offline exercise source snapshots and resumable document embeddings.

Collection and embedding are explicit operations, never request-time operations.
Unreviewed sources are isolated from the planner's recommendation candidates.
"""
import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import sqlite3
from urllib.request import Request, urlopen

from hybrid import VectorIndex

BASE = Path(__file__).parent
ROOT = BASE / 'cache' / 'exercise'


class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript'):
            self.skip += 1
        if tag in ('p', 'div', 'tr', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'section', 'br'):
            self.parts.append('\n')
        if tag in ('td', 'th'):
            self.parts.append(' | ')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript'):
            self.skip = max(0, self.skip - 1)
        if tag in ('p', 'div', 'tr', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'section'):
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

    def text(self):
        return '\n'.join(line for line in (' '.join(x.split()) for x in ''.join(self.parts).splitlines()) if line)


def connect():
    ROOT.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(ROOT / 'sources.sqlite3')
    db.execute('CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, metadata TEXT NOT NULL, sha256 TEXT NOT NULL, raw BLOB NOT NULL, text TEXT NOT NULL)')
    return db


def collect():
    sources = json.loads((BASE / 'exercise_sources.json').read_text(encoding='utf-8'))
    db = connect()
    try:
        for source in sources:
            if source.get('ingestion') == 'sectioned':
                continue  # Imported by prepare_exercise.py with source anchors and grades.
            request = Request(source['url'], headers={'User-Agent': 'StevilResearch/1.0'})
            with urlopen(request, timeout=40) as response:
                raw = response.read(8_000_001)
                if len(raw) > 8_000_000 or 'html' not in response.headers.get('Content-Type', ''):
                    raise ValueError('Unexpected source format')
            parser = PageText()
            parser.feed(raw.decode('utf-8'))
            text = parser.text()
            if len(text) < 300:
                raise ValueError('Source text too short')
            metadata = dict(source, retrievedAt=datetime.now(timezone.utc).isoformat(), reviewStatus='pending')
            with db:
                db.execute('INSERT OR REPLACE INTO sources VALUES (?,?,?,?,?)',
                           (source['id'], json.dumps(metadata, ensure_ascii=False), hashlib.sha256(raw).hexdigest(), raw, text))
            print('Collected', source['id'], len(text), flush=True)
    finally:
        db.close()


def documents():
    db = connect()
    try:
        return [dict(json.loads(meta), section=json.loads(meta)['title'], text=text, sourceSha256=sha)
                for meta, text, sha in db.execute('SELECT metadata,text,sha256 FROM sources ORDER BY id')
                if json.loads(meta).get('indexable', True)]
    finally:
        db.close()


def index():
    return VectorIndex(documents(), ROOT / 'embeddings.sqlite3')


if __name__ == '__main__':
    from app import load_env
    load_env()
    parser = argparse.ArgumentParser()
    parser.add_argument('--collect', action='store_true')
    parser.add_argument('--build-index', action='store_true')
    parser.add_argument('--query', help='Developer retrieval check; not a personal exercise recommendation')
    args = parser.parse_args()
    if args.collect:
        collect()
    vectors = index()
    if args.build_index:
        print('New embeddings:', vectors.build(batch_size=32))
    print(json.dumps({'documents': len(documents()), 'passages': len(vectors.entries), 'vectors': len(vectors.vectors), 'ready': vectors.ready}))
    if args.query:
        if not vectors.ready:
            raise SystemExit('Build exercise index first')
        print(json.dumps(vectors.rank(args.query), ensure_ascii=False))
