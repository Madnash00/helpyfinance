"""Check archive, relationship targets, sheet count, charts and formula in the demo export."""

import posixpath
import sys
from xml.etree import ElementTree
from zipfile import ZipFile

with ZipFile(sys.argv[1]) as workbook:
    assert workbook.testzip() is None
    files = set(workbook.namelist())
    xml = {
        filename: ElementTree.fromstring(workbook.read(filename))
        for filename in files
        if filename.endswith((".xml", ".rels"))
    }
    for filename, node in xml.items():
        if filename.endswith(".rels"):
            parent = posixpath.dirname(posixpath.dirname(filename))
            for relation in node:
                if relation.get("TargetMode") != "External":
                    target = relation.get("Target")
                    local = target.lstrip("/") if target.startswith("/") else posixpath.join(parent, target)
                    assert posixpath.normpath(local) in files, (filename, target)
    assert len(xml["xl/workbook.xml"].findall(".//{*}sheet")) == 7
    assert sum(name.startswith("xl/charts/chart") for name in xml) == 4
    formula = xml["xl/worksheets/sheet2.xml"].find(".//{*}c[@r='D7']/{*}f")
    assert formula is not None and formula.text == "D5-SUM(D6:D6)"
    print("XLSX: archivio, XML, relazioni, 7 fogli, 4 grafici e formula MON verificati.")
