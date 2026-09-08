"""Hash-bound extraction cache; run using Python with pypdf installed."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

class RegionParser(HTMLParser):
    def __init__(self, target):
        super().__init__(convert_charrefs=True)
        self.target, self.stack, self.active, self.parts, self.regions = target, [], None, [], []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('br','hr','img','input','meta','link','source','wbr'):
            if self.active and tag == 'br': self.parts.append('\n')
            return
        self.stack.append(tag)
        if self.active is None and self.target(tag, attrs):
            self.active, self.parts = len(self.stack), []
        if self.active:
            if tag in ('p','div','section','tr','h2','h3','h4'): self.parts.append('\n')
            if tag in ('td','th'): self.parts.append(' | ')
    def handle_endtag(self, tag):
        if tag not in self.stack: return
        position = len(self.stack) - 1 - self.stack[::-1].index(tag)
        if self.active:
            self.parts.append('\n' if tag in ('p','div','tr','h2','h3','h4') else ' ')
            if position < self.active:
                self.regions.append('\n'.join(' '.join(line.split()) for line in ''.join(self.parts).splitlines() if line.strip()))
                self.active = None
        del self.stack[position:]
    def handle_data(self, data):
        if self.active and not any(t in self.stack for t in ('script','style')): self.parts.append(data)

def extract(source_id, path):
    if path.suffix == '.pdf':
        from pypdf import PdfReader
        records = []
        for page, item in enumerate(PdfReader(path).pages, 1):
            text = item.extract_text(extraction_mode='layout').strip()
            if len(text) < 100: continue
            injection = bool(re.search(r'injection|subcutaneous|pre-filled pen', text, re.I))
            oral = bool(re.search(r'tablets?|oral use', text, re.I))
            formulation = 'mixed' if injection and oral else 'injection' if injection else 'oral' if oral else 'unspecified'
            records.append(dict(section=f'PDF page {page}', page=page, text=text, formulation=formulation, formulation_verified=False))
        return records
    if source_id == 'select':
        records = []
        for target in ('summary-abstract','sec-1','sec-2','sec-3'):
            parser = RegionParser(lambda tag, attrs: attrs.get('id') == target)
            parser.feed(path.read_text(encoding='utf-8'))
            if len(parser.regions) != 1: raise ValueError('Missing SELECT section: ' + target)
            records.append(dict(section=target, anchor=target, text=parser.regions[0], formulation='injection', formulation_verified=False))
        return records
    parser = RegionParser(lambda tag, attrs: 'ecl-editor' in attrs.get('class','').split())
    parser.feed(path.read_text(encoding='utf-8'))
    text = '\n\n'.join(parser.regions)
    if 'NAION' not in text or len(text) < 500: raise ValueError('Missing EMA body')
    return [dict(section='Safety notice', text=text, formulation='mixed', formulation_verified=False)]

if __name__ == '__main__':
    latest = {}
    for report in sorted((ROOT / 'runs').glob('*.json')):
        for result in json.loads(report.read_text(encoding='utf-8')).get('results', []): latest[result['source_id']] = result
    output = Path(__file__).with_name('cache') / 'extracted'
    output.mkdir(parents=True, exist_ok=True)
    for source_id in ('us-pi','eu-pi','select','ema-naion'):
        result = latest[source_id]
        if result['status'] != 'downloaded_pending_review': continue
        path = (ROOT / result['relative_path']).resolve()
        if not path.is_relative_to((ROOT / 'raw').resolve()): raise ValueError('Invalid path')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != result['sha256']: raise ValueError('Hash mismatch')
        records = extract(source_id, path)
        (output / f'{source_id}.json').write_text(json.dumps(dict(version=1, source_id=source_id, sha256=digest, records=records), ensure_ascii=False), encoding='utf-8')
        print(source_id, 'records=',len(records))
