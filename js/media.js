/* =========================================================
   KT CLOUD MINING ADMIN
   MEDIA / CONTENT MANAGEMENT — wired to real Supabase
   tables + Storage (bucket: "content")

   Three content types managed here:
   - videos          -> "Educational Videos" -> user app /videos (film icon page)
   - content_guides  -> "Guides" -> Help & Support placeholders (photo or video)
   - content_downloads -> "Downloads" -> Help & Support downloads section (PDF only)
   ========================================================= */

let mediaVideos = [];
let mediaGuides = [];
let mediaDownloads = [];


/* =========================================================
   SHARED HELPERS
   ========================================================= */

function escapeMediaHTML(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

function capitalizeMedia(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatMediaCategory(cat) {
    if (!cat) return "Uncategorized";
    return cat.split("-").map(capitalizeMedia).join(" ");
}

function formatMediaDeleteType(type) {
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

// Simple toast — used for the video-upload confirmation.
let mediaToastTimer = null;

function showMediaToast(message) {

    const toast = document.getElementById("mediaToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    if (mediaToastTimer) clearTimeout(mediaToastTimer);
    mediaToastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);

}


/* =========================================================
   INITIALIZE MEDIA PAGE
   ========================================================= */

function initMedia() {

    console.log("Initializing KT Media page...");

    loadMediaData();

    showMediaTab("overview");

    console.log("KT Media page initialized.");
}


/* =========================================================
   LOAD ALL CONTENT FROM SUPABASE
   ========================================================= */

function loadMediaData() {

    sb.from("videos").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load videos:", error);
                return;
            }
            mediaVideos = data.map(v => ({
                id: v.id, title: v.title,
                description: v.description,
                url: v.url, fileName: v.file_name,
                thumbnail: v.thumbnail_url
            }));
            renderMediaVideos();
            renderMediaOverview();
        });

    sb.from("content_guides").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load guides:", error);
                return;
            }
            mediaGuides = data.map(g => ({
                id: g.id, title: g.title, category: g.category,
                status: g.status,
                video: g.video_url, image: g.image_url
            }));
            renderMediaGuides();
            renderMediaOverview();
        });

    sb.from("content_downloads").select("*").order("created_at")
        .then(({ data, error }) => {
            if (error) {
                console.error("Failed to load downloads:", error);
                return;
            }
            mediaDownloads = data.map(d => ({
                id: d.id, title: d.title,
                description: d.description,
                url: d.file_url, fileName: d.file_name,
                fileType: d.file_type, fileSize: d.file_size
            }));
            renderMediaDownloads();
            renderMediaOverview();
        });

}


/* =========================================================
   OVERVIEW COUNTS
   ========================================================= */

function renderMediaOverview() {

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set("mediaVideoCount", mediaVideos.length);
    set("mediaGuideCount", mediaGuides.length);
    set("mediaDownloadCount", mediaDownloads.length);

}


/* =========================================================
   TABS
   ========================================================= */

function showMediaTab(tabName) {

    document.querySelectorAll(".media-section")
        .forEach(section => section.classList.remove("active"));

    document.querySelectorAll(".media-tab")
        .forEach(tab => tab.classList.remove("active"));

    const selectedSection = document.getElementById("media-" + tabName);
    if (selectedSection) selectedSection.classList.add("active");

    const selectedTab = document.querySelector('.media-tab[data-media-tab="' + tabName + '"]');
    if (selectedTab) selectedTab.classList.add("active");

}


/* =========================================================
   VIDEOS  (Educational Videos -> user app /videos page)
   Add form: title, description, video file, thumbnail only.
   ========================================================= */

function openAddVideoModal() {

    const modal = document.getElementById("mediaVideoModal");
    const form = document.getElementById("videoForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("videoEditId").value = "";
    document.getElementById("videoModalTitle").textContent = "Add Video";

    modal.style.display = "flex";
}

function closeVideoModal() {
    const modal = document.getElementById("mediaVideoModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editMediaVideo(id) {

    const video = mediaVideos.find(v => v.id === id);
    if (!video) return;

    document.getElementById("videoEditId").value = video.id;
    document.getElementById("videoTitle").value = video.title || "";
    document.getElementById("videoDescription").value = video.description || "";

    document.getElementById("videoModalTitle").textContent = "Edit Video";
    document.getElementById("mediaVideoModal").classList.add("active");

}

function saveMediaVideo(event) {

    event.preventDefault();

    const editId = document.getElementById("videoEditId").value;
    const title = document.getElementById("videoTitle").value.trim();
    const description = document.getElementById("videoDescription").value.trim();
    const videoFile = document.getElementById("videoFile");
    const thumbnailInput = document.getElementById("videoThumbnail");

    if (!title) { KTUI.notify("Please enter a video title."); return; }

    if (!editId && (!videoFile || videoFile.files.length === 0)) {
        KTUI.notify("Please choose a video file.");
        return;
    }

    const payload = { title, description };

    const done = KTUI.busy(
        event.target.querySelector('button[type="submit"]'),
        editId ? "Saving..." : "Uploading..."
    );

    Promise.resolve()

        .then(() => {

            if (videoFile && videoFile.files.length > 0) {
                payload.file_name = videoFile.files[0].name;
                return uploadContentFile(videoFile.files[0], "videos").then(url => {
                    payload.url = url;
                });
            }

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

            done();

            if (error) {
                KTUI.notify("Failed to save video: " + error.message);
                return;
            }

            loadMediaData();
            closeVideoModal();
            KTUI.success(editId ? "Video updated successfully." : "Video uploaded successfully.");

        })

        .catch(error => {
            done();
            KTUI.notify("Upload failed: " + error.message);
        });

}

function renderMediaVideos(videos) {

    const container = document.getElementById("mediaVideoList");
    if (!container) return;

    const list = videos || mediaVideos;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="media-empty-state">' +
                '<i class="fa-solid fa-film"></i>' +
                '<h3>No Educational Videos</h3>' +
                '<p>Add educational videos for users to watch.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(video => {

        const item = document.createElement("div");
        item.className = "media-content-item";

        const thumbnail = video.thumbnail
            ? '<img src="' + video.thumbnail + '" alt="Video thumbnail">'
            : '<i class="fa-solid fa-film"></i>';

        item.innerHTML =
            '<div class="media-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="media-content-info">' +
                '<h3 class="media-content-title">' + escapeMediaHTML(video.title) + '</h3>' +
                '<p class="media-content-description">' +
                    escapeMediaHTML(video.description || "No description available.") +
                '</p>' +
            '</div>' +
            '<div class="media-content-actions">' +
                '<button type="button" class="media-content-action" title="Edit Video" onclick="editMediaVideo(\'' + video.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="media-content-action delete" title="Delete Video" onclick="openMediaDeleteModal(\'' + video.id + '\', \'video\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}

function filterMediaVideos() {

    const search = (document.getElementById("videoSearchInput").value || "").toLowerCase();

    const filtered = mediaVideos.filter(v => {
        return !search || (v.title || "").toLowerCase().includes(search);
    });

    renderMediaVideos(filtered);

}


/* =========================================================
   GUIDES  (Help & Support video/photo placeholders)
   Add form: title, category, status (photo/video), one media file
   that switches between a photo picker and a video picker.
   ========================================================= */

function toggleGuideMediaField() {

    const status = document.getElementById("guideStatus").value;
    const photoField = document.getElementById("guidePhotoField");
    const videoField = document.getElementById("guideVideoField");

    if (status === "video") {
        photoField.style.display = "none";
        videoField.style.display = "";
    } else {
        photoField.style.display = "";
        videoField.style.display = "none";
    }

}

function openAddGuideModal() {

    const modal = document.getElementById("mediaGuideModal");
    const form = document.getElementById("guideForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("guideEditId").value = "";
    document.getElementById("guideModalTitle").textContent = "Add Guide";
    document.getElementById("guideStatus").value = "photo";
    toggleGuideMediaField();

    modal.style.display = "flex";
}

function closeGuideModal() {
    const modal = document.getElementById("mediaGuideModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editMediaGuide(id) {

    const guide = mediaGuides.find(g => g.id === id);
    if (!guide) return;

    document.getElementById("guideEditId").value = guide.id;
    document.getElementById("guideTitle").value = guide.title || "";
    document.getElementById("guideCategory").value = guide.category || "";
    document.getElementById("guideStatus").value = guide.status || "photo";
    toggleGuideMediaField();

    document.getElementById("guideModalTitle").textContent = "Edit Guide";
    document.getElementById("mediaGuideModal").classList.add("active");

}

function saveMediaGuide(event) {

    event.preventDefault();

    const editId = document.getElementById("guideEditId").value;
    const title = document.getElementById("guideTitle").value.trim();
    const category = document.getElementById("guideCategory").value;
    const status = document.getElementById("guideStatus").value;

    if (!title) { KTUI.notify("Please enter a guide title."); return; }
    if (!category) { KTUI.notify("Please select a guide category."); return; }

    const imageInput = document.getElementById("guideImage");
    const videoInput = document.getElementById("guideVideoFile");

    const hasNewFile = status === "video"
        ? (videoInput && videoInput.files.length > 0)
        : (imageInput && imageInput.files.length > 0);

    if (!editId && !hasNewFile) {
        KTUI.notify(status === "video" ? "Please choose a guide video." : "Please choose a guide photo.");
        return;
    }

    const payload = { title, category, status };

    const done = KTUI.busy(
        event.target.querySelector('button[type="submit"]'),
        editId ? "Saving..." : "Adding..."
    );

    Promise.resolve()

        .then(() => {

            if (status === "video" && videoInput && videoInput.files.length > 0) {
                return uploadContentFile(videoInput.files[0], "guides").then(url => {
                    payload.video_url = url;
                });
            }

            if (status === "photo" && imageInput && imageInput.files.length > 0) {
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

            done();

            if (error) {
                KTUI.notify("Failed to save guide: " + error.message);
                return;
            }

            loadMediaData();
            closeGuideModal();
            KTUI.notify(editId ? "Guide updated successfully." : "Guide added successfully.");

        })

        .catch(error => { done(); KTUI.notify("Upload failed: " + error.message); });

}

function renderMediaGuides(guides) {

    const container = document.getElementById("mediaGuideList");
    if (!container) return;

    const list = guides || mediaGuides;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="media-empty-state">' +
                '<i class="fa-solid fa-book"></i>' +
                '<h3>No Guides</h3>' +
                '<p>Add help guides for users to see.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(guide => {

        const item = document.createElement("div");
        item.className = "media-content-item";

        const thumbnail = guide.status === "video"
            ? '<i class="fa-solid fa-circle-play"></i>'
            : (guide.image ? '<img src="' + guide.image + '" alt="Guide photo">' : '<i class="fa-solid fa-image"></i>');

        item.innerHTML =
            '<div class="media-content-thumbnail">' + thumbnail + '</div>' +
            '<div class="media-content-info">' +
                '<h3 class="media-content-title">' + escapeMediaHTML(guide.title) + '</h3>' +
                '<div class="media-content-meta">' +
                    '<span class="media-badge media-badge-category">' +
                        escapeMediaHTML(formatMediaCategory(guide.category)) +
                    '</span>' +
                    '<span class="media-badge media-badge-active">' +
                        escapeMediaHTML(capitalizeMedia(guide.status)) +
                    '</span>' +
                '</div>' +
            '</div>' +
            '<div class="media-content-actions">' +
                '<button type="button" class="media-content-action" title="Edit Guide" onclick="editMediaGuide(\'' + guide.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="media-content-action delete" title="Delete Guide" onclick="openMediaDeleteModal(\'' + guide.id + '\', \'guide\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(item);

    });

}

function filterMediaGuides() {

    const search = (document.getElementById("guideSearchInput").value || "").toLowerCase();
    const category = document.getElementById("guideCategoryFilter").value;
    const type = document.getElementById("guideStatusFilter").value;

    const filtered = mediaGuides.filter(g => {
        const matchesSearch = !search || (g.title || "").toLowerCase().includes(search);
        const matchesCategory = category === "all" || g.category === category;
        const matchesType = type === "all" || g.status === type;
        return matchesSearch && matchesCategory && matchesType;
    });

    renderMediaGuides(filtered);

}


/* =========================================================
   DOWNLOADS  (Help & Support downloads section — PDF only)
   Add form: file name, description, upload PDF only.
   ========================================================= */

function openAddDownloadModal() {

    const modal = document.getElementById("mediaDownloadModal");
    const form = document.getElementById("downloadForm");

    if (!modal) return;
    if (form) form.reset();

    document.getElementById("downloadEditId").value = "";
    document.getElementById("downloadModalTitle").textContent = "Add Download";

    modal.style.display = "flex";
}

function closeDownloadModal() {
    const modal = document.getElementById("mediaDownloadModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function editMediaDownload(id) {

    const item = mediaDownloads.find(d => d.id === id);
    if (!item) return;

    document.getElementById("downloadEditId").value = item.id;
    document.getElementById("downloadTitle").value = item.title || "";
    document.getElementById("downloadDescription").value = item.description || "";

    document.getElementById("downloadModalTitle").textContent = "Edit Download";
    document.getElementById("mediaDownloadModal").classList.add("active");

}

function saveMediaDownload(event) {

    event.preventDefault();

    const editId = document.getElementById("downloadEditId").value;
    const title = document.getElementById("downloadTitle").value.trim();
    const fileInput = document.getElementById("downloadFile");

    if (!title) { KTUI.notify("Please enter a file name."); return; }

    const file = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;

    if (!editId && !file) {
        KTUI.notify("Please choose a PDF file.");
        return;
    }

    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        KTUI.notify("Only PDF files are supported.");
        return;
    }

    const payload = {
        title,
        description: document.getElementById("downloadDescription").value.trim()
    };

    const done = KTUI.busy(
        event.target.querySelector('button[type="submit"]'),
        editId ? "Saving..." : "Uploading..."
    );

    Promise.resolve()

        .then(() => {

            if (file) {
                payload.file_name = file.name;
                payload.file_type = file.type || "application/pdf";
                payload.file_size = file.size;

                return uploadContentFile(file, "downloads").then(url => {
                    payload.file_url = url;
                });
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

            done();

            if (error) {
                KTUI.notify("Failed to save download: " + error.message);
                return;
            }

            loadMediaData();
            closeDownloadModal();
            KTUI.notify(editId ? "Download updated successfully." : "Download added successfully.");

        })

        .catch(error => { done(); KTUI.notify("Upload failed: " + error.message); });

}

function renderMediaDownloads(downloads) {

    const container = document.getElementById("mediaDownloadList");
    if (!container) return;

    const list = downloads || mediaDownloads;

    if (list.length === 0) {
        container.innerHTML =
            '<div class="media-empty-state">' +
                '<i class="fa-solid fa-file-arrow-down"></i>' +
                '<h3>No Downloads</h3>' +
                '<p>Add downloadable PDF files for users.</p>' +
            '</div>';
        return;
    }

    container.innerHTML = "";

    list.forEach(item => {

        const el = document.createElement("div");
        el.className = "media-content-item";

        el.innerHTML =
            '<div class="media-content-thumbnail"><i class="fa-solid fa-file-pdf"></i></div>' +
            '<div class="media-content-info">' +
                '<h3 class="media-content-title">' + escapeMediaHTML(item.title) + '</h3>' +
                '<p class="media-content-description">' +
                    escapeMediaHTML(item.description || "No description available.") +
                '</p>' +
                (item.fileSize ? '<div class="media-content-meta"><span class="media-badge media-badge-category">' + formatFileSize(item.fileSize) + '</span></div>' : '') +
            '</div>' +
            '<div class="media-content-actions">' +
                '<button type="button" class="media-content-action" title="Edit" onclick="editMediaDownload(\'' + item.id + '\')">' +
                    '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button type="button" class="media-content-action delete" title="Delete" onclick="openMediaDeleteModal(\'' + item.id + '\', \'download\')">' +
                    '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
            '</div>';

        container.appendChild(el);

    });

}

function filterMediaDownloads() {

    const search = (document.getElementById("downloadSearchInput").value || "").toLowerCase();

    const filtered = mediaDownloads.filter(d => {
        return !search || (d.title || "").toLowerCase().includes(search);
    });

    renderMediaDownloads(filtered);

}


/* =========================================================
   DELETE (shared across videos / guides / downloads)
   ========================================================= */

function openMediaDeleteModal(id, type) {

    document.getElementById("mediaDeleteId").value = id;
    document.getElementById("mediaDeleteType").value = type;

    const message = document.getElementById("mediaDeleteMessage");
    if (message) {
        message.textContent =
            "Are you sure you want to delete this " + formatMediaDeleteType(type) + "? This action cannot be undone.";
    }

    document.getElementById("mediaDeleteModal").style.display = "flex";

}

function closeMediaDeleteModal() {
    const modal = document.getElementById("mediaDeleteModal");

    if (modal) {
        modal.style.display = "none";
    }
}

const MEDIA_DELETE_TABLES = {
    video: "videos",
    guide: "content_guides",
    download: "content_downloads"
};

function confirmMediaDelete() {

    const id = document.getElementById("mediaDeleteId").value;
    const type = document.getElementById("mediaDeleteType").value;

    if (!id || !type) return;

    const table = MEDIA_DELETE_TABLES[type];
    if (!table) return;

    const done = KTUI.busy(
        document.querySelector('[onclick*="confirmMediaDelete"]'),
        "Deleting..."
    );

    sb.from(table).delete().eq("id", id)

        .then(({ error }) => {

            done();

            closeMediaDeleteModal();

            if (error) {
                KTUI.notify("Failed to delete: " + error.message);
                return;
            }

            KTUI.success(
                (type === "video" ? "Video" : type === "guide" ? "Guide" : "Download") + " deleted."
            );

            loadMediaData();

        });

}

/* =========================================================
   MEDIA MODALS — CLICK OUTSIDE TO CLOSE
   Same behavior as Users page modals
========================================================= */

document.addEventListener("click", function(event) {

    if (
        event.target.classList.contains("media-modal")
    ) {

        event.target.style.display = "none";

    }

});