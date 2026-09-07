"""Import verified-source HTML sections; use bundled lxml/pypdf offline.

Technical extraction review does not mean clinical approval. Existing overview
snapshots/vectors remain intact. No network or embedding requests in this script.
"""
import argparse
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import io
import json
import re
from pathlib import Path

from lxml import html
from pypdf import PdfReader

from exercise_store import BASE, ROOT, PageText, connect

WHO_GROUPS = {
    'ch4.s1': 'Children and adolescents aged 5–17',
    'ch4.s2': 'Adults aged 18–64',
    'ch4.s3': 'Older adults aged 65 and older',
    'ch4.s4': 'Pregnant and postpartum women',
    'ch4.s6': 'Adults with specified chronic conditions: cancer survivors, hypertension, type 2 diabetes, HIV',
    'ch4.s7': 'Children/adolescents and adults living with disability; distinguish age-specific recommendations',
}
EASO_SECTIONS = ['obr13273-sec-0001', 'obr13273-sec-0002', 'obr13273-sec-0006',
                 'obr13273-sec-0008', 'obr13273-sec-0016', 'obr13273-sec-1016',
                 'obr13273-sec-0026', 'obr13273-sec-0031', 'obr13273-sec-0037',
                 'obr13273-sec-0043', 'obr13273-sec-0049', 'obr13273-sec-1049']
GRADES = {'A': 'Strong recommendation', 'B': 'Moderate recommendation',
          'C': 'Weak recommendation', 'D': 'Recommendation against',
          'E': 'Expert opinion', 'N': 'No recommendation for or against'}


def element(root, anchor):
    matches = root.xpath('//*[@id=$anchor]', anchor=anchor)
    if len(matches) != 1:
        raise ValueError(f'Missing or ambiguous source anchor: {anchor}')
    return matches[0]


def clean_text(node):
    node = deepcopy(node)
    for item in node.xpath('.//script|.//style|.//nav|.//button'):
        item.drop_tree()
    parser = PageText()
    parser.feed(html.tostring(node, encoding='unicode'))
    return parser.text()


def record(source, raw, text, suffix, title, retrieved, **extra):
    if len(text.strip()) < 40:
        raise ValueError('Unexpectedly empty guideline section')
    metadata = dict(source, id=f"{source['id']}:{suffix}", sourceId=source['id'],
                    title=title, retrievedAt=retrieved, reviewStatus='clinical_review_pending',
                    extractionStatus='structure_validated', indexable=True,
                    glp1Specific=False, **extra)
    return (metadata['id'], json.dumps(metadata, ensure_ascii=False),
            hashlib.sha256(raw).hexdigest(), raw, text)


def easo_recommendations(root, source, raw, retrieved):
    table = element(root, 'obr13273-tbl-0003')
    group = topic = ''
    records = []
    for row in table.xpath('.//tr'):
        cells = [' '.join(cell.text_content().split()) for cell in row.xpath('./th|./td')]
        if not cells or cells[0] == 'Recommendation':
            continue
        if len(cells) != 3:
            raise ValueError('EASO Table 3 column layout changed')
        if not cells[1] and not cells[2]:
            if re.match(r'^\d+\.', cells[0]):
                topic = cells[0]
            else:
                group, topic = cells[0], ''
            continue
        grade = cells[1]
        if grade not in GRADES or not group or not topic or not cells[2]:
            raise ValueError('EASO recommendation lost context or grade')
        ordinal = len(records) + 1
        text = f'{group}\n{topic}\nRecommendation: {cells[0]}\nRecommendation grade: {grade} ({GRADES[grade]})\nCorresponding evidence statements: {cells[2]}'
        records.append(record(source, raw, text, f'table3-r{ordinal:02}',
                              f'EASO Table 3 — {group} — {topic} — recommendation {ordinal}', retrieved,
                              anchor='obr13273-tbl-0003', recommendationGrade=grade,
                              recommendationStrength=GRADES[grade], evidenceStatementIds=cells[2],
                              outcomeGroup=group, outcomeTopic=topic))
    if len(records) != 19:
        raise ValueError(f'EASO Table 3 expected 19 recommendations, found {len(records)}')
    return records


def prepare(source, path):
    raw = path.read_bytes()
    retrieved = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()
    if source['id'] == 'easo-clinicians':
        reader = PdfReader(io.BytesIO(raw))
        if len(reader.pages) != 1:
            raise ValueError('EASO visual summary page count changed')
        text = reader.pages[0].extract_text(
            extraction_mode='layout'
        )

        normalized = re.sub(
            r'[^a-z]',
            '',
            text.lower()
        )

        required_markers = [
            'exercise',
            'overweight',
            'obesity',
        ]

        if not all(
                marker in normalized
                for marker in required_markers
        ):
            raise ValueError(
                'Wrong EASO PDF'
            )
        row = record(source, raw, text, 'page1', source['title'], retrieved, page=1)
        meta = json.loads(row[1])
        # Multicolumn poster: retain for visual verification, not flattened retrieval.
        meta.update(indexable=False, extractionStatus='visual_reference_only')
        return [(row[0], json.dumps(meta, ensure_ascii=False), *row[2:])]
    root = html.fromstring(raw)
    rows = []
    if source['id'] == 'who-recommendations':
        if 'RECOMMENDATIONS' not in clean_text(element(root, '_NBK566046_')):
            raise ValueError('Wrong WHO chapter')
        for anchor, population in WHO_GROUPS.items():
            node = element(root, anchor)
            heading = node.xpath('./h2')
            if len(heading) != 1:
                raise ValueError('WHO population heading missing')
            text = clean_text(node)
            rows.append(record(source, raw, text, anchor, 'WHO — ' + clean_text(heading[0]),
                               retrieved, anchor=anchor, applicablePopulation=population))
    elif source['id'] == 'easo-fulltext':
        if '10.1111/obr.13273' not in raw.decode('utf-8'):
            raise ValueError('Wrong EASO DOI')
        for anchor in EASO_SECTIONS:
            node = deepcopy(element(root, anchor))
            for table in node.xpath('.//*[@id="obr13273-tbl-0003"]'):
                table.drop_tree()  # Stored as complete, graded rows below.
            heading = node.xpath('./h2|./h3')
            if not heading:
                raise ValueError('EASO heading missing')
            rows.append(record(source, raw, clean_text(node), anchor,
                               'EASO — ' + clean_text(heading[0]), retrieved, anchor=anchor))
        rows.extend(easo_recommendations(root, source, raw, retrieved))
    else:
        raise ValueError('Unsupported sectioned source')
    return rows


def main(input_dir):
    sources = json.loads((BASE / 'exercise_sources.json').read_text(encoding='utf-8'))
    rows = []
    for source in sources:
        if source.get('ingestion') == 'sectioned':
            rows.extend(prepare(source, input_dir / source['file']))
    # Validate every input first; an invalid later source leaves existing DB intact.
    db = connect()
    try:
        with db:
            for source in sources:
                if source.get('ingestion') == 'sectioned':
                    db.execute('DELETE FROM sources WHERE id LIKE ?', (source['id'] + ':%',))
            db.executemany('INSERT INTO sources VALUES (?,?,?,?,?)', rows)
    finally:
        db.close()
    print(json.dumps({'imported': len(rows), 'indexable': sum(json.loads(r[1])['indexable'] for r in rows)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-dir', type=Path, default=ROOT / 'review')
    args = parser.parse_args()
    main(args.input_dir)

