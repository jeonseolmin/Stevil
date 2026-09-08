"""Download registered sources with Python 3.10+ (standard library only)."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

ROOT = Path(__file__).resolve().parent
MAX_BYTES = 50 * 1024 * 1024


def now():
    return datetime.now(timezone.utc).isoformat()


def validate_document(data, source, charset="utf-8"):
    if len(data) < 500:
        raise ValueError("Empty or unexpectedly short document")
    if source["format"] == "pdf":
        if not data.startswith(b"%PDF-"):
            raise ValueError("Response is not a PDF")
        return
    body = data.decode(charset, errors="replace")
    title = re.search(r"<title[^>]*>(.*?)</title>", body, re.I | re.S)
    if title and re.search(
        r"checking your browser|just a moment|access denied|captcha|robot check",
        title.group(1), re.I,
    ):
        raise ValueError("Challenge page; manual access required")
    if not re.search(r"<html|<!doctype html", body, re.I):
        raise ValueError("Response is not HTML")
    if source["expected_marker"].casefold() not in body.casefold():
        raise ValueError("Expected document marker missing; inspect source manually")


def collect_source(source, root, run_id, timeout=45):
    result = dict(source_id=source["id"], requested_url=source["url"],
                  collected_at=now(), status="failed", ingest_ready=False)
    try:
        request = Request(source["url"], headers={
            "User-Agent": "Stevil-Research-Collector/0.2", "Accept": "*/*",
        })
        with urlopen(request, timeout=timeout) as response:
            result.update(http_status=response.status, final_url=response.geturl(),
                          content_type=response.headers.get("Content-Type"),
                          last_modified_header=response.headers.get("Last-Modified"))
            data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise ValueError("Document exceeds 50 MiB limit")
            validate_document(data, source, response.headers.get_content_charset() or "utf-8")
        relative = Path("raw") / run_id / f"{source['id']}.{source['format']}"
        destination = root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("xb") as stream:
            stream.write(data)
        result.update(status="downloaded_pending_review", bytes=len(data),
                      sha256=hashlib.sha256(data).hexdigest(),
                      relative_path=relative.as_posix(), revision_date=None,
                      validation="Basic format only; completeness, scope and latest version require review")
    except HTTPError as error:
        result.update(http_status=error.code, error=f"HTTP {error.code}; no access-control bypass attempted")
        error.close()
    except (OSError, ValueError, LookupError) as error:
        result["error"] = str(error)
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="List sources without downloading")
    args = parser.parse_args(argv)
    sources = json.loads((ROOT / "sources.json").read_text(encoding="utf-8-sig"))
    seen = set()
    for source in sources:
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", source["id"]) or source["id"] in seen:
            parser.error("Source IDs must be unique and safe filenames")
        if source["format"] not in {"pdf", "html"} or not source["url"].startswith("https://"):
            parser.error("Sources must be HTTPS PDF/HTML documents")
        seen.add(source["id"])
    if args.list:
        for source in sources:
            print(f"{source['id']}\t{source['url']}")
        return 0
    run_id = now().replace(":", "-") + "-" + uuid4().hex[:8]
    report_dir = ROOT / "runs"
    report_dir.mkdir(parents=True, exist_ok=True)
    report = report_dir / f"{run_id}.json"
    results = []
    for source in sources:
        result = collect_source(source, ROOT, run_id)
        results.append(result)
        temporary = report.with_suffix(".tmp")
        temporary.write_text(json.dumps({"run_id": run_id, "results": results},
                                       ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(report)
        print(f"{source['id']}: {result['status']}" +
              (f" - {result['error']}" if "error" in result else ""))
    print(f"Report: {report}")
    return int(any(result["status"] == "failed" for result in results))


if __name__ == "__main__":
    sys.exit(main())
