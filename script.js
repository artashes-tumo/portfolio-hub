// =========================
// Firebase setup (ES module)
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ✅ Your Firebase config (already public-safe)
const firebaseConfig = {
  apiKey: "AIzaSyBDx0su4MasNevrb8HfMjxceF8lbSGiiPI",
  authDomain: "portfolio-hub-72601.firebaseapp.com",
  projectId: "portfolio-hub-72601",
  storageBucket: "portfolio-hub-72601.appspot.com",
  messagingSenderId: "4260516904",
  appId: "1:4260516904:web:35985d773575490cf8511d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let authUser = null;      // Firebase Auth user
let currentUser = null;   // Firestore profile data (with id)

// =========================
// Helpers
// =========================

function qs(sel) {
  return document.querySelector(sel);
}

function byId(id) {
  return document.getElementById(id);
}

function setText(el, text) {
  if (el) el.textContent = text ?? "";
}

function show(el) {
  if (el) el.classList.remove("hidden");
}

function hide(el) {
  if (el) el.classList.add("hidden");
}

function getUidFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("uid");
}

function setMessage(el, msg, isError = false) {
  if (!el) return;
  el.style.color = isError ? "#dc2626" : "";
  el.textContent = msg;
}

function normalizeSkills(skillsString) {
  const parts = (skillsString || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // unique
  return [...new Set(parts)];
}

// =========================
// Nav UI: hide/show login/logout based on auth
// =========================

function updateNavForAuthState(user) {
  const loginLink = byId("login-link");
  const logoutBtn = byId("logout-btn");
  const dashboardLink = byId("dashboard-link");

  if (user) {
    if (loginLink) loginLink.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
    if (dashboardLink) dashboardLink.classList.remove("hidden");
  } else {
    if (loginLink) loginLink.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.add("hidden");
    if (dashboardLink) dashboardLink.classList.add("hidden");
  }
}

function wireLogout() {
  const logoutBtn = byId("logout-btn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("Logout failed. Check console.");
    }
  });
}

// =========================
// Firestore profile load/create
// =========================

async function loadOrCreateProfile(uid, email) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const defaultProfile = {
      name: email || "New user",
      username: "",
      dateOfBirth: "",
      bio: "",
      profilePicUrl: null,
      projects: [],
      skills: [],
      contact: {
        email: email || "",
        socials: "",
        website: "",
        phone: ""
      }
    };
    await setDoc(ref, defaultProfile);
    currentUser = { id: uid, ...defaultProfile };
  } else {
    currentUser = { id: uid, ...snap.data() };
  }

  return currentUser;
}

// =========================
// Render: public profile page
// =========================

function renderProfile(user) {
  setText(qs(".profile-name"), user?.name || "Unnamed user");
  setText(qs(".profile-username"), user?.username ? `@${user.username}` : "");
  setText(qs(".profile-dob-text"), user?.dateOfBirth || "Not provided");
  setText(qs(".profile-bio"), user?.bio || "");

  const pic = qs(".profile-pic-placeholder");
  if (pic) {
    pic.innerHTML = "IMG";
    if (user?.profilePicUrl) {
      const img = document.createElement("img");
      img.src = user.profilePicUrl;
      img.alt = "Profile picture";
      img.className = "profile-pic-img";
      pic.innerHTML = "";
      pic.appendChild(img);
    }
  }
}

function renderProjects(user) {
  const grid = qs(".projects-grid");
  if (!grid) return;

  grid.innerHTML = "";

  const list = user?.projects || [];
  if (list.length === 0) {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.innerHTML = `<p>No projects yet.</p>`;
    grid.appendChild(div);
    return;
  }

  list.forEach(p => {
    const card = document.createElement("article");
    card.className = "project-card";
    card.innerHTML = `
      <h3 class="project-title">${p.title || ""}</h3>
      <p class="project-description">${p.description || ""}</p>
      ${
        p.link
          ? `<a href="${p.link}" target="_blank" class="project-link">View project</a>`
          : ""
      }
    `;
    grid.appendChild(card);
  });
}

function renderSkills(user) {
  const ul = qs(".skills-list");
  if (!ul) return;

  ul.innerHTML = "";
  const skills = user?.skills || [];

  if (skills.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No skills added yet.";
    ul.appendChild(li);
    return;
  }

  skills.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;
    ul.appendChild(li);
  });
}

function renderContact(user) {
  const ul = qs(".contact-list");
  if (!ul) return;

  ul.innerHTML = "";

  const c = user?.contact || {};
  const { email, socials, website, phone } = c;

  if (email) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Email:</strong> ${email}`;
    ul.appendChild(li);
  }
  if (socials) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Socials:</strong> ${socials}`;
    ul.appendChild(li);
  }
  if (website) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Website:</strong> <a href="${website}" target="_blank">${website}</a>`;
    ul.appendChild(li);
  }
  if (phone) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Phone:</strong> ${phone}`;
    ul.appendChild(li);
  }

  if (!email && !socials && !website && !phone) {
    const li = document.createElement("li");
    li.textContent = "No contact info provided.";
    ul.appendChild(li);
  }
}

// =========================
// Index page init
// =========================

async function initIndexPage() {
  const profileMain = qs(".profile-page");
  if (!profileMain) return;

  const uidFromUrl = getUidFromUrl();
  const emptyState = byId("profile-empty-state");

  // If URL has uid -> show that user
  if (uidFromUrl) {
    hide(emptyState);
    const snap = await getDoc(doc(db, "users", uidFromUrl));
    if (!snap.exists()) {
      show(emptyState);
      setText(qs(".profile-name"), "User not found");
      renderProjects({ projects: [] });
      renderSkills({ skills: [] });
      renderContact({ contact: {} });
      return;
    }

    const u = { id: uidFromUrl, ...snap.data() };
    renderProfile(u);
    renderProjects(u);
    renderSkills(u);
    renderContact(u);
    return;
  }

  // No uid: show own profile if logged in
  if (authUser) {
    hide(emptyState);
    const u = await loadOrCreateProfile(authUser.uid, authUser.email);
    renderProfile(u);
    renderProjects(u);
    renderSkills(u);
    renderContact(u);
    return;
  }

  // Guest, no uid: show welcome empty state
  show(emptyState);
  setText(qs(".profile-name"), "PortfolioHub");
  setText(qs(".profile-username"), "");
  setText(qs(".profile-bio"), "");
  renderProjects({ projects: [] });
  renderSkills({ skills: [] });
  renderContact({ contact: {} });
}

// =========================
// Login page init
// =========================

function initLoginPage() {
  const loginForm = byId("login-form");
  const registerForm = byId("register-form");
  if (!loginForm || !registerForm) return;

  const loginMsg = byId("login-message");
  const registerMsg = byId("register-message");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMessage(loginMsg, "");

    const email = byId("login-email").value.trim();
    const password = byId("login-password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      setMessage(loginMsg, "Login failed. Check email/password.", true);
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMessage(registerMsg, "");

    const name = byId("register-name").value.trim();
    const username = byId("register-username").value.trim();
    const email = byId("register-email").value.trim();
    const password = byId("register-password").value;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      const uid = cred.user.uid;
      const ref = doc(db, "users", uid);

      const newProfile = {
        name: name || email,
        username: username || "",
        dateOfBirth: "",
        bio: "",
        profilePicUrl: null,
        projects: [],
        skills: [],
        contact: {
          email: email,
          socials: "",
          website: "",
          phone: ""
        }
      };

      await setDoc(ref, newProfile);
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      setMessage(registerMsg, "Register failed. Try a stronger password or different email.", true);
    }
  });
}

// =========================
// Dashboard init
// =========================

async function initDashboardPage() {
  const dashboardRoot = qs(".dashboard-page");
  if (!dashboardRoot) return;

  // Must be logged in
  if (!authUser) {
    window.location.href = "login.html";
    return;
  }

  const u = await loadOrCreateProfile(authUser.uid, authUser.email);

  // Header
  const headerEl = byId("dashboard-current-user");
  if (headerEl) {
    headerEl.textContent = `${u.name || "Unnamed"} ${u.username ? "(" + u.username + ")" : ""}`;
  }

  // Form refs
  const profileForm = byId("profile-form");
  const profileSaveMsg = byId("profile-save-message");

  const nameInput = byId("profile-name-input");
  const usernameInput = byId("profile-username-input");
  const dobInput = byId("profile-dob-input");
  const bioInput = byId("profile-bio-input");
  const skillsInput = byId("profile-skills-input");

  const emailInput = byId("profile-email-input");
  const socialsInput = byId("profile-socials-input");
  const websiteInput = byId("profile-website-input");
  const phoneInput = byId("profile-phone-input");

  // Prefill
  nameInput.value = u.name || "";
  usernameInput.value = u.username || "";
  dobInput.value = u.dateOfBirth || "";
  bioInput.value = u.bio || "";
  skillsInput.value = (u.skills || []).join(", ");

  emailInput.value = u.contact?.email || authUser.email || "";
  socialsInput.value = u.contact?.socials || "";
  websiteInput.value = u.contact?.website || "";
  phoneInput.value = u.contact?.phone || "";

  // Projects
  const projectList = byId("project-list");
  const newProjectForm = byId("new-project-form");
  const projectSaveMsg = byId("project-save-message");

  function renderProjectList() {
    if (!projectList) return;
    projectList.innerHTML = "";

    (currentUser.projects || []).forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "project-list-item";
      item.innerHTML = `
        <div class="project-list-item-header">
          <span class="project-list-item-title">${p.title || ""}</span>
          <button type="button" class="project-delete-btn" data-idx="${idx}">Delete</button>
        </div>
        <p class="project-list-item-description">${p.description || ""}</p>
        ${p.link ? `<a class="project-list-item-link" href="${p.link}" target="_blank">${p.link}</a>` : ""}
      `;
      projectList.appendChild(item);
    });

    projectList.querySelectorAll(".project-delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-idx"));
        if (!Number.isInteger(idx)) return;

        currentUser.projects.splice(idx, 1);

        try {
          await updateDoc(doc(db, "users", currentUser.id), { projects: currentUser.projects });
          renderProjectList();
          setMessage(projectSaveMsg, "Project deleted.");
          setTimeout(() => setMessage(projectSaveMsg, ""), 1500);
        } catch (err) {
          console.error(err);
          setMessage(projectSaveMsg, "Failed to delete project.", true);
        }
      });
    });
  }

  renderProjectList();

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    currentUser.name = nameInput.value.trim();
    currentUser.username = usernameInput.value.trim();
    currentUser.dateOfBirth = dobInput.value || "";
    currentUser.bio = bioInput.value.trim();
    currentUser.skills = normalizeSkills(skillsInput.value);

    currentUser.contact = {
      email: emailInput.value.trim(),
      socials: socialsInput.value.trim(),
      website: websiteInput.value.trim(),
      phone: phoneInput.value.trim()
    };

    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        name: currentUser.name,
        username: currentUser.username,
        dateOfBirth: currentUser.dateOfBirth,
        bio: currentUser.bio,
        skills: currentUser.skills,
        contact: currentUser.contact
      });

      setMessage(profileSaveMsg, "Profile saved.");
      setTimeout(() => setMessage(profileSaveMsg, ""), 1500);

      const headerEl2 = byId("dashboard-current-user");
      if (headerEl2) headerEl2.textContent = `${currentUser.name || "Unnamed"} ${currentUser.username ? "(" + currentUser.username + ")" : ""}`;
    } catch (err) {
      console.error(err);
      setMessage(profileSaveMsg, "Failed to save profile.", true);
    }
  });

  newProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = byId("new-project-title").value.trim();
    const description = byId("new-project-description").value.trim();
    const link = byId("new-project-link").value.trim();

    if (!title || !description) return;

    currentUser.projects = currentUser.projects || [];
    currentUser.projects.push({ title, description, link });

    try {
      await updateDoc(doc(db, "users", currentUser.id), { projects: currentUser.projects });
      renderProjectList();
      setMessage(projectSaveMsg, "Project added.");
      setTimeout(() => setMessage(projectSaveMsg, ""), 1500);

      byId("new-project-title").value = "";
      byId("new-project-description").value = "";
      byId("new-project-link").value = "";
    } catch (err) {
      console.error(err);
      setMessage(projectSaveMsg, "Failed to add project.", true);
    }
  });

  // =========================
  // Delete account (robust)
  // =========================
  const deleteBtn = byId("delete-account-btn");
  const deleteMsg = byId("delete-account-message");

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      setMessage(deleteMsg, "");

      if (!auth.currentUser) return;

      const confirmed = confirm(
        "Are you absolutely sure?\n\nThis will permanently delete your account and all your projects."
      );
      if (!confirmed) return;

      // ✅ Robust fix:
      // We reauthenticate FIRST (so deleteUser never fails),
      // then delete Firestore doc,
      // then delete Auth user.
      try {
        const email = auth.currentUser.email;
        if (!email) {
          setMessage(deleteMsg, "No email on this account. Cannot reauthenticate.", true);
          return;
        }

        const password = prompt("For security, type your password to confirm account deletion:");
        if (!password) {
          setMessage(deleteMsg, "Cancelled (password not provided).", true);
          return;
        }

        const cred = EmailAuthProvider.credential(email, password);
        await reauthenticateWithCredential(auth.currentUser, cred);

        // Delete Firestore profile
        await deleteDoc(doc(db, "users", auth.currentUser.uid));

        // Delete Auth account
        await deleteUser(auth.currentUser);

        window.location.href = "index.html";
      } catch (err) {
        console.error(err);

        // Common cases:
        // auth/wrong-password, auth/invalid-credential, auth/requires-recent-login
        setMessage(deleteMsg, "Delete failed. Wrong password or you need to login again.", true);
      }
    });
  }
}

// =========================
// Search page init
// =========================

async function initSearchPage() {
  const input = byId("search-input");
  const typeSel = byId("search-type");
  const results = byId("search-results");
  const count = byId("search-count");

  if (!input || !typeSel || !results || !count) return;

  let users = [];

  try {
    const snap = await getDocs(collection(db, "users"));
    users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    count.textContent = "Start typing to see results.";
  } catch (err) {
    console.error(err);
    count.textContent = "Failed to load users.";
    return;
  }

  function renderUsers(query) {
    const q = query.toLowerCase().trim();
    results.innerHTML = "";

    if (!q) {
      count.textContent = "Start typing to see results.";
      return;
    }

    const matches = users.filter(u => {
      const name = (u.name || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });

    count.textContent = `${matches.length} user(s) found.`;

    matches.forEach(u => {
      const card = document.createElement("div");
      card.className = "search-result-card";

      const projectCount = (u.projects || []).length;

      card.innerHTML = `
        <div class="search-result-title">${u.name || "Unnamed user"}</div>
        <div class="search-result-subtitle">${u.username ? "@" + u.username : "No username"} • Projects: ${projectCount}</div>

        <div class="search-result-actions">
          <button class="search-action-btn" data-open-profile="${u.id}">Open public profile</button>
          ${
            authUser && authUser.uid === u.id
              ? `<button class="search-action-btn" data-open-dashboard="me">Open my dashboard</button>`
              : ""
          }
        </div>
      `;

      results.appendChild(card);
    });

    results.querySelectorAll("[data-open-profile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-open-profile");
        window.location.href = `index.html?uid=${encodeURIComponent(uid)}`;
      });
    });

    results.querySelectorAll("[data-open-dashboard]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = "dashboard.html";
      });
    });
  }

  function renderProjects(query) {
    const q = query.toLowerCase().trim();
    results.innerHTML = "";

    if (!q) {
      count.textContent = "Start typing to see results.";
      return;
    }

    const all = [];
    users.forEach(u => {
      (u.projects || []).forEach(p => all.push({ user: u, project: p }));
    });

    const matches = all.filter(x => {
      const t = (x.project.title || "").toLowerCase();
      const d = (x.project.description || "").toLowerCase();
      const owner = (x.user.name || "").toLowerCase();
      return t.includes(q) || d.includes(q) || owner.includes(q);
    });

    count.textContent = `${matches.length} project(s) found.`;

    matches.forEach(x => {
      const card = document.createElement("div");
      card.className = "search-result-card";

      card.innerHTML = `
        <div class="search-result-title">${x.project.title || "Untitled"}</div>
        <div class="search-result-subtitle">By ${x.user.name || "Unnamed user"}</div>
        <p style="margin-top:0.4rem; color:#4b5563;">${x.project.description || ""}</p>

        <div class="search-result-actions">
          <button class="search-action-btn" data-open-profile="${x.user.id}">
            View owner's profile
          </button>
          ${
            x.project.link
              ? `<a class="search-action-btn" style="text-decoration:none;display:inline-block;"
                   href="${x.project.link}" target="_blank">Open project link</a>`
              : ""
          }
        </div>
      `;

      results.appendChild(card);
    });

    results.querySelectorAll("[data-open-profile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const uid = btn.getAttribute("data-open-profile");
        window.location.href = `index.html?uid=${encodeURIComponent(uid)}`;
      });
    });
  }

  function runSearch() {
    const q = input.value;
    const type = typeSel.value;
    if (type === "users") renderUsers(q);
    else renderProjects(q);
  }

  input.addEventListener("input", runSearch);
  typeSel.addEventListener("change", runSearch);
}

// =========================
// Boot
// =========================

document.addEventListener("DOMContentLoaded", () => {
  wireLogout();

  onAuthStateChanged(auth, async (user) => {
    authUser = user || null;
    updateNavForAuthState(authUser);

    // Init pages AFTER auth state known
    await initIndexPage();
    initLoginPage();
    await initDashboardPage();
    await initSearchPage();
  });
});