/* =========================================================
   KT CLOUD MINING ADMIN
   SETTINGS / CONTENT MANAGEMENT — wired to real Supabase
   tables + Storage (bucket: "content")
   ========================================================= */

let settingsVideos = [];
let settingsGuides = [];
let settingsTutorials = [];
let settingsDownloads = [];
let settingsMedia = [];


/* =========================================================
   SHARED HELPERS
   ========================================================= */

function generateSettingsId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function escapeSettingsHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function capitalizeSettings(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatSettingsCategory(cat) {
    if (!cat) return "Uncategorized";
    return cat.split("-").map(capitalizeSettings).join(" ");
}

function formatSettingsDeleteType(type) {
    return type;
}

function formatFileSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Uploads a file into the shared "content" storage bucket under
// the given folder, and returns its public URL.
function uploadContentFile(file, folder) {

    const path = folder + "/" + Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    return sb.storage.from("content").upload(path, file)
        .then(({ error }) => {

            if (error) throw error;

            const { data } = sb.storage.from("content").getPublicUrl(path);

            return data.publicUrl;

        });

}


/* =========================================================
   INITIALIZE SETTINGS PAGE
   ========================================================= */

function initSettings() {

    console.log("Initializing KT Settings page...");

    loadSettingsData();

    showSettingsTab("overview");

    console.log("KT Settings page initialized.");
}


/* =========================================================
   LOAD ALL CONTENT FROM SUPABASE
   ========================================================= */

function loadSettingsData() {

    sb.from("videos").select("*").order("sort_order")
        .then(({ data, error }) => {
            if (!error) {
                settingsVideos = data.map(v => ({
                    id: v.id, title: v.title, category: v.category,
                    status: v.status, description: v.description,
                    url: v.url, fileName: v.file_name,
                    thumbnail: v.thumbnail_url, order: v.sort_order
                }));
                renderSettingsVideos();
                renderSettingsOverview();
            }
        });

    sb.from("content_guides").select("*").order("sort_order")
        .then(({ data, error }) => {
            if (!error) {
                settingsGuides = data.map(g => ({
                    id: g.id, title: g.title, category: g.category,
                    status: g.status, description: g.description,
                    content: g.content, video: g.video_url,
                    image: g.image_url, order: g.sort_order
                }));
                renderSettingsGuides();
                renderSettingsOverview();
            }
        });

    sb.from("content_tutorials").select("*").order("sort_order")
        .then(({ data, error }) => {
            if (!error) {
                settingsTutorials = data.map(t => ({
                    id: t.id, title: t.title, category: t.category,
                    status: t.status, description: t.description,
                    content: t.content, video: t.video_url,
                    images: t.images || [], order: t.sort_order
                }));
                renderSettingsTutorials();
                renderSettingsOverview();
            }
        });

    sb.from("content_downloads").select("*").order("sort_order")
        .then(({ data, error }) => {
            if (!error) {
                settingsDownloads = data.map(d => ({
                    id: d.id, title: d.title, category: d.category,
                    status: d.status, description: d.description,
                    url: d.file_url, fileName: d.file_name,
                    fileType: d.file_type, fileSize: d.file_size,
                    order: d.sort_order
                }));
                renderSettingsDownloads();
                renderSettingsOverview();
            }
        });

    sb.from("content_media").select("*").order("created_at", { ascending: false })
        .then(({ data, error }) => {
            if (!error) {
                settingsMedia = data.map(m => ({
                    id: m.id, title: m.title, type: m.type,
                    description: m.description, usage: m.usage,
                    fileName: m.file_name, fileType: m.file_type,
                    fileSize: m.file_size, used: m.used,
                    preview: m.type === "image" ? m.file_url : "",
                    url: m.file_url
                }));
                renderSettingsMedia();
                renderSettingsOverview();
            }
        });

}


/* =========================================================
   OVERVIEW COUNTS
   ========================================================= */

function renderSettingsOverview() {

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("settingsVideoCount", settingsVideos.length);
    set("settingsGuideCount", settingsGuides.length);
    set("settingsTutorialCount", settingsTutorials.length);
    set("settingsDownloadCount", settingsDownloads.length);
    set("settingsPhotoCount", settingsMedia.filter(m => m.type === "image").length);
    set("settingsFileCount", settingsMedia.filter(m => m.type !== "image").length);

}


/* =========================================================
   TABS
   ========================================================= */

function showSettingsTab(tabName) {

    document.querySelectorAll(".settings-section")
        .forEach(section => section.classList.remove("active"));

    document.querySelectorAll(".settings-tab")
        .forEach(tab => tab.classList.remove("active"));

    const selectedSection = document.getElementById("settings-" + tabName);
    if (selectedSection) selectedSection.classList.add("active");

    const selectedTab = document.querySelector('.settings-tab[data-tab="' + tabName + '"]');
    if (selectedTab) selectedTab.classList.add("active");

}


/* =========================================================
   VIDEOS
   ========================================================= */

function openAddVideoModal() {

    const modal = document.getElementById("settingsVideoModal");
    const form = document.getElementById("videoForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("videoEditId").value = "";
    document.getElementById("videoModalTitle").textContent = "Add Video";

    modal.classList.add("active");
}

function closeVideoModal() {
    document.getElementById("settingsVideoModal").classList.remove("active");
}

function editSettingsVideo(id) {

    const video = settingsVideos.find(v => v.id === id);
    if (!video) return;

    document.getElementById("videoEditId").value = video.id;
    document.getElementById("videoTitle").value = video.title || "";
    document.getElementById("videoCategory").value = video.category || "";
    document.getElementById("videoStatus").value = video.status || "active";
    document.getElementById("videoDescription").value = video.description || "";
    document.getElementById("videoUrl").value = video.url || "";
    document.getElementById("videoOrder").value = video.order || 0;

    document.getElementById("videoModalTitle").textContent = "Edit Video";
    document.getElementById("settingsVideoModal").classList.add("active");

}

function saveSettingsVideo(event) {

    event.preventDefault();

    const editId = document.getElementById("videoEditId").value;
    const title = document.getElementById("videoTitle").value.trim();
    const category = document.getElementById("videoCategory").value;
    const status = document.getElementById("videoStatus").value;
    const description = document.getElementById("videoDescription").value.trim();
    const videoUrl = document.getElementById("videoUrl").value.trim();
    const videoFile = document.getElementById("videoFile");
    const thumbnailInput = document.getElementById("videoThumbnail");
    const displayOrder = parseInt(document.getElementById("videoOrder").value) || 0;

    if (!title) { alert("Please enter a video title."); return; }
    if (!category) { alert("Please select a video category."); return; }

    const existing = editId ? settingsVideos.find(v => v.id === editId) : null;

    const payload = {
        title, category, status, description,
        sort_order: displayOrder
    };

    Promise.resolve()

        .then(() => {

            // A real video file was uploaded — store it and use its URL
            if (videoFile && videoFile.files.length > 0) {
                payload.file_name = videoFile.files[0].name;
                return uploadContentFile(videoFile.files[0], "videos").then(url => {
                    payload.url = url;
                });
            }

            // Otherwise use the pasted URL (e.g. a YouTube link)
            payload.url = videoUrl || (existing ? existing.url : "");
            payload.file_name = existing ? existing.fileName : "";

        })

        .then(() => {

            if (thumbnailInput && thumbnailInput.files.length > 0) {
                return uploadContentFile(thumbnailInput.files[0], "thumbnails").then(url => {
                    payload.thumbnail_url = url;
                });
            }

        })

        .then(() => {

            if (editId) {
                return sb.from("videos").update(payload).eq("id", editId);
            } else {
                return sb.from("videos").insert(payload);
            }

        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save video: " + error.message);
                return;
            }

            loadSettingsData();
            closeVideoModal();
            alert(editId ? "Video updated successfully." : "Video added successfully.");

        })

        .catch(error => {
            alert("Upload failed: " + error.message);
        });

}

function renderSettingsVideos(videos) {

    const container = document.getElementById("settingsVideoList");
    if (!container) return;

    const list = videos || settingsVideos;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-film"></i>' +
                '<h3>No Educational Videos</h3>' +
                '<p>Add educational videos for users to watch.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(video => {

        const item = document.createElement("div");
        item.className = "settings-content-item";

        const thumbnail = video.thumbnail
            ? '<img src="' + video.thumbnail + '" alt="Video thumbnail">'
            : '<i class="fa-solid fa-film"></i>';

        item.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(video.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(video.description || "No description available.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(video.category)) +
                    '</span>' +
                    '<span class="settings-badge ' +
                        (video.status === "active" ? "settings-badge-active" : "settings-badge-inactive") +
                    '">' + escapeSettingsHTML(capitalizeSettings(video.status)) + '</span>' +
                    '<span class="settings-badge settings-badge-category">Order: ' + Number(video.order || 0) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action" title="Edit Video" onclick="editSettingsVideo(\'' + video.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="settings-content-action delete" title="Delete Video" onclick="openSettingsDeleteModal(\'' + video.id + '\', \'video\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}


/* =========================================================
   GUIDES
   ========================================================= */

function openAddGuideModal() {

    const modal = document.getElementById("settingsGuideModal");
    const form = document.getElementById("guideForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("guideEditId").value = "";
    document.getElementById("guideModalTitle").textContent = "Add Guide";

    modal.classList.add("active");
}

function closeGuideModal() {
    document.getElementById("settingsGuideModal").classList.remove("active");
}

function editSettingsGuide(id) {

    const guide = settingsGuides.find(g => g.id === id);
    if (!guide) return;

    document.getElementById("guideEditId").value = guide.id;
    document.getElementById("guideTitle").value = guide.title || "";
    document.getElementById("guideCategory").value = guide.category || "";
    document.getElementById("guideStatus").value = guide.status || "active";
    document.getElementById("guideDescription").value = guide.description || "";
    document.getElementById("guideContent").value = guide.content || "";
    document.getElementById("guideVideo").value = guide.video || "";
    document.getElementById("guideOrder").value = guide.order || 0;

    document.getElementById("guideModalTitle").textContent = "Edit Guide";
    document.getElementById("settingsGuideModal").classList.add("active");

}

function saveSettingsGuide(event) {

    event.preventDefault();

    const editId = document.getElementById("guideEditId").value;
    const title = document.getElementById("guideTitle").value.trim();
    const category = document.getElementById("guideCategory").value;

    if (!title) { alert("Please enter a guide title."); return; }
    if (!category) { alert("Please select a guide category."); return; }

    const payload = {
        title, category,
        status: document.getElementById("guideStatus").value,
        description: document.getElementById("guideDescription").value.trim(),
        content: document.getElementById("guideContent").value.trim(),
        video_url: document.getElementById("guideVideo").value.trim(),
        sort_order: parseInt(document.getElementById("guideOrder").value) || 0
    };

    const imageInput = document.getElementById("guideImage");

    Promise.resolve()

        .then(() => {
            if (imageInput && imageInput.files && imageInput.files.length > 0) {
                return uploadContentFile(imageInput.files[0], "guides").then(url => {
                    payload.image_url = url;
                });
            }
        })

        .then(() => {
            if (editId) {
                return sb.from("content_guides").update(payload).eq("id", editId);
            } else {
                return sb.from("content_guides").insert(payload);
            }
        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save guide: " + error.message);
                return;
            }

            loadSettingsData();
            closeGuideModal();
            alert(editId ? "Guide updated successfully." : "Guide added successfully.");

        })

        .catch(error => alert("Upload failed: " + error.message));

}

function renderSettingsGuides(guides) {

    const container = document.getElementById("settingsGuideList");
    if (!container) return;

    const list = guides || settingsGuides;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-book"></i>' +
                '<h3>No Guides</h3>' +
                '<p>Add help guides for users to read.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(guide => {

        const item = document.createElement("div");
        item.className = "settings-content-item";

        const thumbnail = guide.image
            ? '<img src="' + guide.image + '" alt="Guide image">'
            : '<i class="fa-solid fa-book"></i>';

        item.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(guide.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(guide.description || "No description available.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(guide.category)) +
                    '</span>' +
                    '<span class="settings-badge ' +
                        (guide.status === "active" ? "settings-badge-active" : "settings-badge-inactive") +
                    '">' + escapeSettingsHTML(capitalizeSettings(guide.status)) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action" title="Edit Guide" onclick="editSettingsGuide(\'' + guide.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="settings-content-action delete" title="Delete Guide" onclick="openSettingsDeleteModal(\'' + guide.id + '\', \'guide\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}


/* =========================================================
   TUTORIALS
   ========================================================= */

function openAddTutorialModal() {

    const modal = document.getElementById("settingsTutorialModal");
    const form = document.getElementById("tutorialForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("tutorialEditId").value = "";
    document.getElementById("tutorialModalTitle").textContent = "Add Tutorial";

    modal.classList.add("active");
}

function closeTutorialModal() {
    document.getElementById("settingsTutorialModal").classList.remove("active");
}

function editSettingsTutorial(id) {

    const tutorial = settingsTutorials.find(t => t.id === id);
    if (!tutorial) return;

    document.getElementById("tutorialEditId").value = tutorial.id;
    document.getElementById("tutorialTitle").value = tutorial.title || "";
    document.getElementById("tutorialCategory").value = tutorial.category || "";
    document.getElementById("tutorialStatus").value = tutorial.status || "active";
    document.getElementById("tutorialDescription").value = tutorial.description || "";
    document.getElementById("tutorialContent").value = tutorial.content || "";
    document.getElementById("tutorialVideo").value = tutorial.video || "";
    document.getElementById("tutorialOrder").value = tutorial.order || 0;

    document.getElementById("tutorialModalTitle").textContent = "Edit Tutorial";
    document.getElementById("settingsTutorialModal").classList.add("active");

}

function saveSettingsTutorial(event) {

    event.preventDefault();

    const editId = document.getElementById("tutorialEditId").value;
    const title = document.getElementById("tutorialTitle").value.trim();
    const category = document.getElementById("tutorialCategory").value;

    if (!title) { alert("Please enter a tutorial title."); return; }
    if (!category) { alert("Please select a tutorial category."); return; }

    const payload = {
        title, category,
        status: document.getElementById("tutorialStatus").value,
        description: document.getElementById("tutorialDescription").value.trim(),
        content: document.getElementById("tutorialContent").value.trim(),
        video_url: document.getElementById("tutorialVideo").value.trim(),
        sort_order: parseInt(document.getElementById("tutorialOrder").value) || 0
    };

    const imagesInput = document.getElementById("tutorialImages");
    const existing = editId ? settingsTutorials.find(t => t.id === editId) : null;

    Promise.resolve()

        .then(() => {

            if (imagesInput && imagesInput.files && imagesInput.files.length > 0) {

                const uploads = Array.from(imagesInput.files).map(file =>
                    uploadContentFile(file, "tutorials")
                );

                return Promise.all(uploads).then(urls => {
                    payload.images = (existing ? existing.images : []).concat(urls);
                });

            } else {
                payload.images = existing ? existing.images : [];
            }

        })

        .then(() => {
            if (editId) {
                return sb.from("content_tutorials").update(payload).eq("id", editId);
            } else {
                return sb.from("content_tutorials").insert(payload);
            }
        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save tutorial: " + error.message);
                return;
            }

            loadSettingsData();
            closeTutorialModal();
            alert(editId ? "Tutorial updated successfully." : "Tutorial added successfully.");

        })

        .catch(error => alert("Upload failed: " + error.message));

}

function renderSettingsTutorials(tutorials) {

    const container = document.getElementById("settingsTutorialList");
    if (!container) return;

    const list = tutorials || settingsTutorials;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-graduation-cap"></i>' +
                '<h3>No Tutorials</h3>' +
                '<p>Add step-by-step tutorials for users.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(tutorial => {

        const item = document.createElement("div");
        item.className = "settings-content-item";

        const thumbnail = (tutorial.images && tutorial.images.length > 0)
            ? '<img src="' + tutorial.images[0] + '" alt="Tutorial image">'
            : '<i class="fa-solid fa-graduation-cap"></i>';

        item.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(tutorial.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(tutorial.description || "No description available.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(tutorial.category)) +
                    '</span>' +
                    '<span class="settings-badge ' +
                        (tutorial.status === "active" ? "settings-badge-active" : "settings-badge-inactive") +
                    '">' + escapeSettingsHTML(capitalizeSettings(tutorial.status)) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action" title="Edit Tutorial" onclick="editSettingsTutorial(\'' + tutorial.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="settings-content-action delete" title="Delete Tutorial" onclick="openSettingsDeleteModal(\'' + tutorial.id + '\', \'tutorial\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}


/* =========================================================
   DOWNLOADS
   ========================================================= */

function openAddDownloadModal() {

    const modal = document.getElementById("settingsDownloadModal");
    const form = document.getElementById("downloadForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("downloadEditId").value = "";
    document.getElementById("downloadModalTitle").textContent = "Add Download";

    modal.classList.add("active");
}

function closeDownloadModal() {
    document.getElementById("settingsDownloadModal").classList.remove("active");
}

function editSettingsDownload(id) {

    const item = settingsDownloads.find(d => d.id === id);
    if (!item) return;

    document.getElementById("downloadEditId").value = item.id;
    document.getElementById("downloadTitle").value = item.title || "";
    document.getElementById("downloadCategory").value = item.category || "";
    document.getElementById("downloadStatus").value = item.status || "active";
    document.getElementById("downloadDescription").value = item.description || "";
    document.getElementById("downloadUrl").value = item.url || "";
    document.getElementById("downloadOrder").value = item.order || 0;

    document.getElementById("downloadModalTitle").textContent = "Edit Download";
    document.getElementById("settingsDownloadModal").classList.add("active");

}

function saveSettingsDownload(event) {

    event.preventDefault();

    const editId = document.getElementById("downloadEditId").value;
    const title = document.getElementById("downloadTitle").value.trim();
    const category = document.getElementById("downloadCategory").value;
    const fileInput = document.getElementById("downloadFile");
    const urlValue = document.getElementById("downloadUrl").value.trim();
    const existing = editId ? settingsDownloads.find(d => d.id === editId) : null;

    if (!title) { alert("Please enter a file name."); return; }
    if (!category) { alert("Please select a category."); return; }

    if (!urlValue && (!fileInput || fileInput.files.length === 0) && !existing) {
        alert("Please provide a file or file URL.");
        return;
    }

    const payload = {
        title, category,
        status: document.getElementById("downloadStatus").value,
        description: document.getElementById("downloadDescription").value.trim(),
        sort_order: parseInt(document.getElementById("downloadOrder").value) || 0
    };

    Promise.resolve()

        .then(() => {

            if (fileInput && fileInput.files.length > 0) {

                const file = fileInput.files[0];
                payload.file_name = file.name;
                payload.file_type = file.type;
                payload.file_size = file.size;

                return uploadContentFile(file, "downloads").then(url => {
                    payload.file_url = url;
                });

            } else {

                payload.file_url = urlValue || (existing ? existing.url : "");
                payload.file_name = existing ? existing.fileName : "";
                payload.file_type = existing ? existing.fileType : "";
                payload.file_size = existing ? existing.fileSize : 0;

            }

        })

        .then(() => {
            if (editId) {
                return sb.from("content_downloads").update(payload).eq("id", editId);
            } else {
                return sb.from("content_downloads").insert(payload);
            }
        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save download: " + error.message);
                return;
            }

            loadSettingsData();
            closeDownloadModal();
            alert(editId ? "Download updated successfully." : "Download added successfully.");

        })

        .catch(error => alert("Upload failed: " + error.message));

}

function renderSettingsDownloads(downloads) {

    const container = document.getElementById("settingsDownloadList");
    if (!container) return;

    const list = downloads || settingsDownloads;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-file-arrow-down"></i>' +
                '<h3>No Downloads</h3>' +
                '<p>Add downloadable files for users.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(item => {

        const el = document.createElement("div");
        el.className = "settings-content-item";

        el.innerHTML =
            '<div class="settings-content-thumbnail"><i class="fa-solid fa-file-arrow-down"></i></div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(item.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(item.description || "No description available.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' +
                        escapeSettingsHTML(formatSettingsCategory(item.category)) +
                    '</span>' +
                    '<span class="settings-badge ' +
                        (item.status === "active" ? "settings-badge-active" : "settings-badge-inactive") +
                    '">' + escapeSettingsHTML(capitalizeSettings(item.status)) + '</span>' +
                    (item.fileSize ? '<span class="settings-badge settings-badge-category">' + formatFileSize(item.fileSize) + '</span>' : '') +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action" title="Edit" onclick="editSettingsDownload(\'' + item.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="settings-content-action delete" title="Delete" onclick="openSettingsDeleteModal(\'' + item.id + '\', \'download\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(el);

    });

}


/* =========================================================
   MEDIA LIBRARY
   ========================================================= */

function openUploadMediaModal() {

    const form = document.getElementById("mediaForm");
    if (form) form.reset();

    document.getElementById("settingsMediaModal").classList.add("active");
}

function closeMediaModal() {
    document.getElementById("settingsMediaModal").classList.remove("active");
}

function saveSettingsMedia(event) {

    event.preventDefault();

    const title = document.getElementById("mediaTitle").value.trim();
    const type = document.getElementById("mediaType").value;
    const description = document.getElementById("mediaDescription").value.trim();
    const fileInput = document.getElementById("mediaFile");
    const usage = document.getElementById("mediaUsage").value;

    if (!title) { alert("Please enter a media name."); return; }
    if (!type) { alert("Please select a media type."); return; }
    if (!fileInput || fileInput.files.length === 0) { alert("Please select a file."); return; }

    const file = fileInput.files[0];

    uploadContentFile(file, "media")

        .then(url => {

            return sb.from("content_media").insert({
                title, type, description, usage,
                file_url: url,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                used: false
            });

        })

        .then(({ error }) => {

            if (error) {
                alert("Failed to save media: " + error.message);
                return;
            }

            loadSettingsData();
            closeMediaModal();
            alert("Media uploaded successfully.");

        })

        .catch(error => alert("Upload failed: " + error.message));

}

function renderSettingsMedia(media) {

    const container = document.getElementById("settingsMediaList");
    if (!container) return;

    const list = media || settingsMedia;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="settings-empty-state">' +
                '<i class="fa-solid fa-photo-film"></i>' +
                '<h3>No Media Files</h3>' +
                '<p>Upload images and files to your media library.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(item => {

        const el = document.createElement("div");
        el.className = "settings-content-item";

        const thumbnail = item.type === "image" && item.preview
            ? '<img src="' + item.preview + '" alt="' + escapeSettingsHTML(item.title) + '">'
            : '<i class="fa-solid fa-file"></i>';

        el.innerHTML =
            '<div class="settings-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="settings-content-info">' +
                '<h3 class="settings-content-title">' + escapeSettingsHTML(item.title) + '</h3>' +
                '<p class="settings-content-description">' +
                    escapeSettingsHTML(item.description || "No description.") +
                '</p>' +
                '<div class="settings-content-meta">' +
                    '<span class="settings-badge settings-badge-category">' + escapeSettingsHTML(item.type) + '</span>' +
                    '<span class="settings-badge settings-badge-category">' + formatFileSize(item.fileSize) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="settings-content-actions">' +
                '<button type="button" class="settings-content-action delete" title="Delete" onclick="openSettingsDeleteModal(\'' + item.id + '\', \'media\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(el);

    });

}


/* =========================================================
   DELETE (shared across all 5 content types)
   ========================================================= */

function openSettingsDeleteModal(id, type) {

    document.getElementById("settingsDeleteId").value = id;
    document.getElementById("settingsDeleteType").value = type;

    const message = document.getElementById("settingsDeleteMessage");
    if (message) {
        message.textContent =
            "Are you sure you want to delete this " + formatSettingsDeleteType(type) + "? This action cannot be undone.";
    }

    document.getElementById("settingsDeleteModal").classList.add("active");

}

function closeSettingsDeleteModal() {
    document.getElementById("settingsDeleteModal").classList.remove("active");
}

const SETTINGS_DELETE_TABLES = {
    video: "videos",
    guide: "content_guides",
    tutorial: "content_tutorials",
    download: "content_downloads",
    media: "content_media"
};

function confirmSettingsDelete() {

    const id = document.getElementById("settingsDeleteId").value;
    const type = document.getElementById("settingsDeleteType").value;

    if (!id || !type) return;

    const table = SETTINGS_DELETE_TABLES[type];
    if (!table) return;

    sb.from(table).delete().eq("id", id)

        .then(({ error }) => {

            closeSettingsDeleteModal();

            if (error) {
                alert("Failed to delete: " + error.message);
                return;
            }

            loadSettingsData();

        });

}
