# PingKhana: announcement sources (survey 2026-11-04)

Survey done with curl, UA `PingKhanaBot/0.1 (+https://github.com/Vector033/PingKhana)`, 2 s between requests, at most 16 requests per host.
No host in this survey has RSS/Atom (no `<link rel="alternate" type="application/rss+xml">` on any page checked), so every source is HTML.
Fixtures are in `backend/tests/fixtures/html/`, saved byte-for-byte as served (`<id>_list.html`, `<id>_detail_1.html`, `<id>_detail_2.html`).

## Sources in use

All 5 were approved by the project owner on 2026-11-04.

| id | name | list URL | type | robots.txt | charset | approx. new posts |
|----|------|----------|------|------------|---------|-------------------|
| `cs_cmu` | CS Dept. homepage post grids | https://www.cs.science.cmu.ac.th/ | html | 404 (allowed) | UTF-8 (meta only; HTTP header has no charset) | ~1/month (latest 2026-08-03) |
| `sci_cmu` | Faculty of Science homepage news block | https://www.science.cmu.ac.th/2022/ (`/` 302 to here) | html | 404 (allowed) | UTF-8 | 2-4/week, mostly PR |
| `sdd_cmu` | CMU Student Development Division (กองพัฒนานักศึกษา), "ประชาสัมพันธ์" list | https://sdd.oop.cmu.ac.th/cmuNewsList/15 | html | `Disallow:` empty (all allowed) | UTF-8 | a few per year (scholarship posts sometimes) |
| `cmu_jobs` | CMU news group "ข่าวรับสมัครงาน" | https://www.cmu.ac.th/th/articlegroup/726e7707-60ca-497f-aff9-077a4f380b5d | html | allowed (only /Control, /Bin, /ResourceText disallowed) | UTF-8 | 3-5/week |
| `cmu_events` | CMU news group "ประชุมสัมมนา/กิจกรรมของมหาวิทยาลัย" | https://www.cmu.ac.th/th/articlegroup/c902f832-5354-4579-83da-1ec08a468e68 | html | allowed (as above) | UTF-8 | 4-5/day, mostly PR; some talks and registrations |

### Selectors (selectolax CSS)

**cs_cmu** (WordPress 6.3 + Elementor, served as a static export on IIS)
- List item: `article.eael-grid-post` (15 items: 5 grids x 3 newest posts; post id in `data-id`)
- Title: `h2.eael-entry-title a.eael-grid-post-link` (the `title` attribute equals the full text)
- Link: same anchor's `href`. It is relative (`2026/08/03/<percent-encoded-thai-slug>/`), so resolve against `https://www.cs.science.cmu.ac.th/`
- Published date: not in the list. Parse it from the URL path `/(\d{4})/(\d{2})/(\d{2})/`
- Category: grid-level only. The enclosing `div.eael-post-grid-container`'s `data-args` contains `tax_query...terms...=26` (26 = admissions/announcements; 16 = หลักสูตรอบรม; 12+9 = ประชาสัมพันธ์; 17 = แสดงความยินดี; 5 = กิจกรรม)
- Detail content: `div.colibri-post-content`
- Detail title: no `<h1>`. Use `<title>` and strip the suffix ` – Computer Science` (`&#8211;`)
- Detail date: none in the markup. Use the URL path. `body` has class `postid-NNNN`
- Detail links are relative to the post URL (`../../../../wp-content/...`, `../../../../icpc2026/`), so resolve against the page URL

**sci_cmu** (custom PHP)
- List item: `div.member` (8 newest items)
- Title: `div.member-info h4 a`
- Link: same anchor's `href`, relative (`news-detail.php?id=5800`). Resolve against `https://www.science.cmu.ac.th/2022/`
- Published date: the last `span` that is a direct child of `div.member-info`, format `3 พ.ย. 2569` (abbreviated month, BE year)
- Category: `div.member-info span a` (e.g. ข่าวอื่นๆ, รางวัลและความภาคภูมิใจ)
- Detail content: `section.news-detail div.col-lg-8` (body text is in a `div[style*="justify"]`; stop before `div.social-share`)
- Detail title: `section.news-detail h2`
- Detail date: none on the detail page. Keep the list date

**sdd_cmu** (custom PHP, Bootstrap)
- List item: `a.row[href*="/cmuNewsItem/"]` (20 items, newest first by id)
- Title: `a.row div.wrap-news p`
- Link: the `a.row` `href`, absolute but **http://** (`http://sdd.oop.cmu.ac.th/cmuNewsItem/101`); the site redirects to https, so rewrite the scheme
- Published date: **none anywhere** (list or detail). Use first-seen time. The numeric id grows over time
- Detail content: `div.mar-news + div.row` (the row right after the cover image)
- Detail title: `h3.cosdd`
- Detail date: none
- Sibling lists with the same template: `/cmuNewsList/13` (กิจกรรม), `/cmuNewsList/14` (ประกาศ/สมัครงาน; stale, mostly sports-field closures in 2567)

**cmu_jobs and cmu_events** (ASP.NET WebForms, same template)
- List item: `div.masonry-item` (id `cphPageContent_wucArticleGroup_rptGalleryItem_items_news_N`, 20 per page)
- Title: `a.link[id*="rptGalleryItem_hlHeader_"]` (full title)
- Link: the same anchor's `href`, root-relative `/th/article/<guid>`. Resolve against `https://www.cmu.ac.th`
- Published date: `span[id*="rptGalleryItem_lbCreateDate_"]`, format `2 พฤศจิกายน 2569` (full month, BE year)
- Unit/faculty: `span[id*="rptGalleryItem_lbSubname_"]`
- Detail content: `#cphPageContent_wucArticleView_lbContent`
- Detail title: `#cphPageContent_wucArticleView_lbHeader`
- Detail date: `#cphPageContent_wucArticleView_lbDate`, e.g. `2 พฤศจิกายน  2569` (**two spaces** before the year, so normalise whitespace)
- Detail extras: `#cphPageContent_wucArticleView_lbOrg` (unit); attachments are in `#cphPageContent_wucArticleView_wucArticleFile_gvFileList a[href*="ArticleDownload.aspx"]` (PDFs; some posts give the deadline only in the PDF)

### Pagination and date notes
- `cs_cmu`: no archive pages exist (static export). `/page/2/` is 404, `/2026/` is an empty 200, and `?cat=26` returns the homepage unchanged. Only the 3 newest posts per category are visible, which is enough at ~1 post/month.
- `sci_cmu`: the full list `scinewsall.php` is filled by jQuery `$.post('autoload_news.php', {group_no, str, cids})`. That is a POST/XHR, so it is not used. The homepage block (8 items) is server-rendered, and at 2-4 posts/week a 60-minute poll is enough. Body text often uses **Thai digits** (`๒๙ ตุลาคม ๒๕๖๙`).
- `sdd_cmu`: there is no pagination link (20 items visible) and no dates. Most actual scholarship calls go out on the Facebook page "ทุนการศึกษา มช." (not scrapeable), so this source is thin.
- `cmu_jobs` and `cmu_events`: further pages are only reachable through `__doPostBack` (POST plus VIEWSTATE), so they are not used. Page 1 (20 items) covers ~4 weeks for jobs and ~4 days for events. The same article can appear in both groups (e.g. VET CMU Job Fair), so dedupe by URL. `cmu_jobs` is mostly staff hiring at CMU units (RA jobs and job fairs are relevant for students). It is the richest source of explicit deadlines.
- All dates seen use BE years (2567-2569). CE years appear only in English text (`October 8, 2026`). Weekday names (`วันพฤหัสบดีที่ 29 ...`) are consistent with the dates.

## Checked and rejected

| URL | reason |
|-----|--------|
| https://www.cs.science.cmu.ac.th/feed/, /wp-json | 404 (static export; no RSS) |
| https://www.cs.science.cmu.ac.th/?cat=26, /page/2/, /2026/ | ignored query / 404 / empty 200 (see above) |
| https://www.science.cmu.ac.th/2022/scinewsall.php | list body loaded by POST XHR (`autoload_news.php`); not fetched |
| https://www.science.cmu.ac.th/2022/student.php | navigation page only, no announcements |
| https://www.science.cmu.ac.th/webthai/all-job.php | faculty staff/lecturer recruitment, not student-facing (server-rendered `job-detail.php?id=`; could be added later) |
| https://coop.science.cmu.ac.th | DNS does not resolve (Science co-op site linked from the faculty menu) |
| https://job.science.cmu.ac.th/jobfair.php | static job-fair company list (ids up to 38, no dates); robots.txt returns 403; detail and jobs behind `login.php` |
| https://web.science.cmu.ac.th/Main/Home/home?pageid=blQ5Z01LamtBdD09 (Science student affairs unit) | 4.4 MB page; news are inline base64 images with no text; robots.txt redirects to a "CMU Network Only" 403 page |
| https://job.mis.cmu.ac.th/ (CMU Job Search) | login only (CMU OAuth or business login) |
| https://www.cmu.ac.th/th/content/D7ABB770-4C2B-41EE-825E-720939F6DFD4 (ทุนการศึกษา) | static link page pointing to SDD and others |
| https://sdd.oop.cmu.ac.th/service/scholarship, /th/sclmenu | static description of scholarship types, no dated calls |
| https://sdd.oop.cmu.ac.th/service/cmujob | static page pointing to job.mis (login) and Facebook |
| http://inter.oop.cmu.ac.th/ird-scholarship.php | DNS does not resolve |
| https://www.grad.cmu.ac.th/, https://grad.cmu.ac.th/ | DNS does not resolve from this machine (8.8.8.8 resolves grad.cmu.ac.th; retry from the server) |
| Facebook pages (ทุนการศึกษา มช., CMU Job Search, cmucoopfan) | login/JS-only, out of scope |

## Other details
- Privacy: `https://sdd.oop.cmu.ac.th/cmuNewsItem/99` (scholarship award list) contains student names and student IDs. It is **not** saved as a fixture. The collector should avoid storing or forwarding such lists verbatim.
- None of the chosen pages need JavaScript to show their list items. Only the Science full-news list does.
