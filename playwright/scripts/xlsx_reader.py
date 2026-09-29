"""
Minimal .xlsx reader shared by the catalogue extractors (`extract-cases.py`,
`extract-smoke.py`). Standard library only: an .xlsx is a zip of XML, and the repo has no pip.
"""
import re
import xml.etree.ElementTree as ET
import zipfile

NS = {
    'm': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}


def read_workbook(path):
    """Yield (sheet_name, rows) where rows is a list of {column_letter: text} dicts."""
    zf = zipfile.ZipFile(path)

    shared = []
    if 'xl/sharedStrings.xml' in zf.namelist():
        for si in ET.fromstring(zf.read('xl/sharedStrings.xml')):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))

    rels = ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))
    targets = {rel.get('Id'): rel.get('Target') for rel in rels}
    workbook = ET.fromstring(zf.read('xl/workbook.xml'))

    for sheet in workbook.find('m:sheets', NS):
        target = targets[sheet.get('{%s}id' % NS['r'])]
        # Relative to xl/ ("worksheets/sheet1.xml") or absolute ("/xl/worksheets/…", as openpyxl writes).
        target = target[1:] if target.startswith('/') else target
        if not target.startswith('xl/'):
            target = 'xl/' + target
        yield sheet.get('name'), list(_rows(zf, target, shared))


def _rows(zf, target, shared):
    root = ET.fromstring(zf.read(target))
    for row in root.find('m:sheetData', NS):
        cells = {}
        for cell in row:
            col = re.match(r'[A-Z]+', cell.get('r')).group()
            value_el = cell.find('m:v', NS)
            inline_el = cell.find('m:is', NS)
            if cell.get('t') == 's' and value_el is not None:
                text = shared[int(value_el.text)]
            elif inline_el is not None:
                text = ''.join(t.text or '' for t in inline_el.iter('{%s}t' % NS['m']))
            elif value_el is not None:
                text = value_el.text
            else:
                continue
            if text not in (None, ''):
                cells[col] = text
        if cells:
            yield cells
