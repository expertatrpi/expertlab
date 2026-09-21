// Client-side replacement for the old server-rendered /search/ view.
// Static hosting has no backend, so this fetches the pre-built search index
// (data/search_index.json) and reproduces the same markup search_results.html
// used to render server-side, so the design/formatting stays identical.
(function () {
    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function includes(haystack, needle) {
        return String(haystack || '').toLowerCase().indexOf(needle) !== -1;
    }

    function stripTags(html) {
        return String(html || '').replace(/<[^>]*>/g, '');
    }

    function truncate(str, n) {
        str = String(str || '');
        return str.length > n ? str.slice(0, n) + '...' : str;
    }

    function formatDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        if (isNaN(d)) return iso;
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }

    var params = new URLSearchParams(window.location.search);
    var query = (params.get('s') || '').trim();

    var queryEl = document.getElementById('search-query');
    if (queryEl) queryEl.textContent = query;
    document.title = query ? ('Search Results for \'' + query + '\' || Expert') : document.title;

    if (!query) return; // leave the server-rendered "no results" shell as-is

    var body = document.getElementById('search-body');
    if (!body) return;

    fetch('../data/search_index.json')
        .then(function (r) { return r.json(); })
        .then(function (idx) { render(idx); })
        .catch(function () {
            body.innerHTML = '<div class="text-center py-5"><h3>Search unavailable</h3>' +
                '<p>Could not load the search index.</p></div>';
        });

    function render(idx) {
        var q = query.toLowerCase();
        var mediaBase = '../media/';

        var people = idx.people.filter(function (p) {
            return includes(p.name, q) || includes(p.introduction, q) || includes(p.position, q) || includes(p.department, q);
        });
        var research = idx.research.filter(function (r) {
            return includes(r.title, q) || includes(r.description, q) || includes(r.lead_researcher, q);
        });
        var news = idx.news.filter(function (n) {
            return includes(n.title, q) || includes(n.intro, q);
        });
        var teaching = idx.teaching.filter(function (t) {
            return includes(t.course_name, q) || includes(t.course_code, q) || includes(t.description, q);
        });
        var labPubs = idx.lab_publications.filter(function (p) {
            return includes(p.title, q) || includes(p.abstract, q);
        });
        var userPubs = idx.user_publications.filter(function (p) {
            return includes(p.title, q) || includes(p.abstract, q);
        });

        if (!people.length && !research.length && !news.length && !teaching.length && !labPubs.length && !userPubs.length) {
            body.innerHTML = '<div class="text-center py-5"><i class="fas fa-search fa-4x text-muted mb-3"></i>' +
                '<h3>No results found</h3><p>Try searching for something else or check your spelling.</p></div>';
            return;
        }

        var html = '';

        if (people.length) {
            html += '<div class="mb-5"><h4 class="text-primary border-bottom pb-2 mb-3"><i class="fas fa-users me-2"></i>People</h4><div class="row">';
            people.forEach(function (p) {
                html += '<div class="col-md-4 mb-4"><div class="card h-100 shadow-sm border-0"><div class="card-body d-flex align-items-center">' +
                    '<div class="flex-shrink-0 me-3">' +
                    (p.profile_picture
                        ? '<img src="' + mediaBase + p.profile_picture + '" alt="' + escapeHtml(p.name) + '" class="rounded-circle" style="width:60px;height:60px;object-fit:cover;">'
                        : '<div class="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" style="width:60px;height:60px;"><i class="fas fa-user"></i></div>') +
                    '</div><div><h5 class="card-title mb-1"><a href="../people/' + encodeURIComponent(p.username) + '/" class="text-dark">' + escapeHtml(p.name) + '</a></h5>' +
                    '<p class="card-text text-muted small mb-0">' + escapeHtml(p.position || p.role) + '</p>' +
                    '<p class="card-text text-muted small">' + escapeHtml(p.department || '') + '</p></div></div></div></div>';
            });
            html += '</div></div>';
        }

        if (research.length) {
            html += '<div class="mb-5"><h4 class="text-primary border-bottom pb-2 mb-3"><i class="fas fa-flask me-2"></i>Research Projects</h4><div class="list-group list-group-flush">';
            research.forEach(function (r) {
                html += '<a href="../research/' + r.id + '/" class="list-group-item list-group-item-action py-3 border-0 rounded mb-2 shadow-sm">' +
                    '<div class="d-flex w-100 justify-content-between align-items-center"><h5 class="mb-1 text-primary">' + escapeHtml(r.title) + '</h5>' +
                    '<span class="badge bg-secondary rounded-pill">' + escapeHtml(r.status) + '</span></div>' +
                    '<p class="mb-1 text-truncate">' + escapeHtml(stripTags(r.description)) + '</p>' +
                    '<small class="text-muted">Lead: ' + escapeHtml(r.lead_researcher) + '</small></a>';
            });
            html += '</div></div>';
        }

        if (news.length) {
            html += '<div class="mb-5"><h4 class="text-primary border-bottom pb-2 mb-3"><i class="fas fa-newspaper me-2"></i>News</h4><div class="row">';
            news.forEach(function (n) {
                html += '<div class="col-md-6 mb-3"><div class="card h-100 border-0 shadow-sm"><div class="row g-0 h-100">' +
                    '<div class="col-4">' + (n.featured_image_1 ? '<img src="' + mediaBase + n.featured_image_1 + '" class="img-fluid rounded-start h-100 w-100" style="object-fit:cover;" alt="...">' : '') + '</div>' +
                    '<div class="col-8"><div class="card-body"><h5 class="card-title text-truncate"><a href="../news/' + n.id + '/" class="text-dark">' + escapeHtml(n.title) + '</a></h5>' +
                    '<p class="card-text small text-muted">' + escapeHtml(truncate(n.intro, 100)) + '</p>' +
                    '<p class="card-text"><small class="text-muted">' + formatDate(n.publication_date) + '</small></p></div></div>' +
                    '</div></div></div>';
            });
            html += '</div></div>';
        }

        if (labPubs.length || userPubs.length) {
            html += '<div class="mb-5"><h4 class="text-primary border-bottom pb-2 mb-3"><i class="fas fa-book me-2"></i>Publications</h4><ul class="list-group list-group-flush">';
            labPubs.forEach(function (p) {
                html += '<li class="list-group-item border-0 rounded mb-2 shadow-sm py-3"><h6 class="mb-1">' + escapeHtml(p.title) + '</h6>' +
                    '<div class="d-flex gap-2 align-items-center">' +
                    (p.link ? '<a href="' + escapeHtml(p.link) + '" class="btn btn-sm btn-outline-primary" target="_blank"><i class="fas fa-external-link-alt me-1"></i>Link</a>' : '') +
                    (p.pdf ? '<a href="' + mediaBase + p.pdf + '" class="btn btn-sm btn-outline-danger" target="_blank"><i class="fas fa-file-pdf me-1"></i>Paper</a>' : '') +
                    (p.research_id ? '<a href="../research/' + p.research_id + '/" class="small text-decoration-none">View Research</a>' : '') +
                    '<span class="ms-auto badge bg-light text-dark">Lab Publication</span></div></li>';
            });
            userPubs.forEach(function (p) {
                html += '<li class="list-group-item border-0 rounded mb-2 shadow-sm py-3"><h6 class="mb-1">' + escapeHtml(p.title) + '</h6>' +
                    '<div class="d-flex gap-2 align-items-center">' +
                    (p.link ? '<a href="' + escapeHtml(p.link) + '" class="btn btn-sm btn-outline-primary" target="_blank"><i class="fas fa-external-link-alt me-1"></i>Link</a>' : '') +
                    (p.pdf ? '<a href="' + mediaBase + p.pdf + '" class="btn btn-sm btn-outline-danger" target="_blank"><i class="fas fa-file-pdf me-1"></i>Paper</a>' : '') +
                    (p.username ? '<a href="../people/' + encodeURIComponent(p.username) + '/" class="small text-decoration-none">View Author: ' + escapeHtml(p.user_name) + '</a>' : '') +
                    '<span class="ms-auto badge bg-light text-dark">User Publication</span></div></li>';
            });
            html += '</ul></div>';
        }

        if (teaching.length) {
            html += '<div class="mb-5"><h4 class="text-primary border-bottom pb-2 mb-3"><i class="fas fa-chalkboard-teacher me-2"></i>Teaching</h4><div class="list-group list-group-flush">';
            teaching.forEach(function (t) {
                html += '<div class="list-group-item border-0 rounded mb-2 shadow-sm py-3"><div class="d-flex w-100 justify-content-between"><h5 class="mb-1">' +
                    (t.link ? '<a href="' + escapeHtml(t.link) + '" class="text-primary">' + escapeHtml(t.course_code) + ': ' + escapeHtml(t.course_name) + '</a>' : '<span class="text-dark">' + escapeHtml(t.course_code) + ': ' + escapeHtml(t.course_name) + '</span>') +
                    '</h5><small>' + escapeHtml(t.semester) + '</small></div>' +
                    '<p class="mb-1 small">' + escapeHtml(t.description || '') + '</p>' +
                    '<a href="../teaching/" class="small text-muted text-decoration-none">View all Teaching</a></div>';
            });
            html += '</div></div>';
        }

        body.innerHTML = html;
    }
})();
