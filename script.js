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

// ✅ Your Firebase config (public-safe)
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

let authUser = null;     // Firebase Auth user
let currentUser = null;  // Firestore document data + id

// =========================
// Helpers
// =========================
const qs = (s) => document.querySelector(s);
const byId = (id) => document.getElementById(id);

function show(el) { if (el) el.classList.remove("hidden"); }
function hide(el) { if (el) el.classList.add("hidden"); }

function setText(el, text) { if (el) el.textContent = text ?? ""; }

function setMessage(el, msg, type = "") {
  if (!el) return;
  el.textContent = msg ?? "";
  el.dataset.type = type || "";
}

function getUidFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get("uid");
}

function normalizeSkills(input) {
  const parts = (input || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

// =========================
// Nav UI
// =========================
function updateNav(user) {
  const loginLink = byId("login-link");
  const logoutBtn = byId("logout-btn");
  const dashboardLink = byId("dashboard-link");

  if (user) {
    hide(loginLink);
    show(logoutBtn);
    show(dashboardLink);
  } else {
    show(loginLink);
    hide(logoutBtn);
    hide(dashboardLink);
  }
}

function wireLogout() {
  const logoutBtn = byId("logout-btn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (e) {
      console.error(e);
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
      profilePicUrl: "",
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
    return { id: uid, ...defaultProfile };
  }

  return { id: uid, ...snap.data() };
}

async function loadPublicProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: uid, ...snap.data() };
}

// =========================
// Render: profile page
// =========================
function renderProfile(u) {
  setText(qs(".profile-name"), u?.name || "Unnamed user");

  const uname = qs(".profile-username");
  if (uname) {
    if (u?.username) {
      uname.textContent = "@" + u.username;
      uname.classList.remove("hidden");
    } else {
      uname.textContent = "";
      uname.classList.add("hidden");
    }
  }

  setText(qs(".profile-dob-text"), u?.dateOfBirth || "Not provided");
  setText(qs(".profile-bio"), u?.bio || "");

  const pic = qs(".profile-pic-placeholder");
  if (pic) {
    pic.innerHTML = "IMG";
    if (u?.profilePicUrl) {
      const img = document.createElement("img");
      img.src = u.profilePicUrl;
      img.alt = "Profile picture";
      img.className = "profile-pic-img";
      pic.innerHTML = "";
      pic.appendChild(img);
    }
  }
}

function renderProjects(u) {
  const grid = qs(".projects-grid");
  if (!grid) return;

  grid.innerHTML = "";
  const list = u?.projects || [];

  if (list.length === 0) {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.innerHTML = `
      <p class="muted">No projects yet.</p>
      <p class="tiny muted">If this is your profile, open Dashboard to add one.</p>
    `;
    grid.appendChild(div);
    return;
  }

  list.forEach((p) => {
    const card = document.createElement("article");
    card.className = "project-card";
    card.innerHTML = `
      <h4 class="project-title">${p.title || ""}</h4>
      <p class="project-description">${p.description || ""}</p>
      ${p.link
        ? `<a class="btn btn-ghost btn-sm" href="${p.link}" target="_blank" rel="noreferrer">Open link</a>`
        : ""
      }
    `;
    grid.appendChild(card);
  });
}

function renderSkills(u) {
  const ul = qs(".skills-list");
  if (!ul) return;

  ul.innerHTML = "";
  const skills = u?.skills || [];

  if (skills.length === 0) {
    const li = document.createElement("li");
    li.className = "muted tiny";
    li.textContent = "No skills added yet.";
    ul.appendChild(li);
    return;
  }

  skills.forEach((s) => {
    const li = document.createElement("li");
    li.className = "skill-chip";
    li.textContent = s;
    ul.appendChild(li);
  });
}

function renderContact(u) {
  const ul = qs(".contact-list");
  if (!ul) return;

  ul.innerHTML = "";
  const c = u?.contact || {};
  const items = [];

  if (c.email) items.push({ k: "Email", v: c.email });
  if (c.socials) items.push({ k: "Socials", v: c.socials });
  if (c.website) items.push({ k: "Website", v: c.website, isLink: true });
  if (c.phone) items.push({ k: "Phone", v: c.phone });

  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "muted tiny";
    li.textContent = "No contact info provided.";
    ul.appendChild(li);
    return;
  }

  items.forEach((it) => {
    const li = document.createElement("li");
    li.className = "contact-item";

    if (it.isLink) {
      li.innerHTML = `<span class="contact-k">${it.k}</span>
        <a class="text-link" href="${it.v}" target="_blank" rel="noreferrer">${it.v}</a>`;
    } else {
      li.innerHTML = `<span class="contact-k">${it.k}</span><span>${it.v}</span>`;
    }

    ul.appendChild(li);
  });
}

// =========================
// Init: Profile page
// =========================
async function initProfilePage() {
  const landing = byId("landing-card");
  const uid = getUidFromUrl();

  // Public view by uid
  if (uid) {
    if (landing) hide(landing);
    const publicUser = await loadPublicProfile(uid);

    if (!publicUser) {
      renderProfile({ name: "User not found", bio: "This profile does not exist." });
      renderProjects({ projects: [] });
      renderSkills({ skills: [] });
      renderContact({ contact: {} });
      return;
    }

    renderProfile(publicUser);
    renderProjects(publicUser);
    renderSkills(publicUser);
    renderContact(publicUser);
    return;
  }

  // Logged in: your own profile
  if (authUser) {
    if (landing) hide(landing);
    currentUser = await loadOrCreateProfile(authUser.uid, authUser.email || "");
    renderProfile(currentUser);
    renderProjects(currentUser);
    renderSkills(currentUser);
    renderContact(currentUser);
    return;
  }

  // Guest: show landing + empty states
  if (landing) show(landing);
  renderProjects({ projects: [] });
  renderSkills({ skills: [] });
  renderContact({ contact: {} });
}

// =========================
// Init: Dashboard
// =========================
async function initDashboardPage() {
  if (!authUser) {
    window.location.href = "login.html";
    return;
  }

  currentUser = await loadOrCreateProfile(authUser.uid, authUser.email || "");

  const headerEl = byId("dashboard-current-user");
  if (headerEl) {
    headerEl.textContent =
      `${currentUser.name || "User"}${currentUser.username ? " (@" + currentUser.username + ")" : ""}`;
  }

  // Inputs
  const nameInput = byId("profile-name-input");
  const usernameInput = byId("profile-username-input");
  const dobInput = byId("profile-dob-input");
  const bioInput = byId("profile-bio-input");
  const picInput = byId("profile-pic-input");
  const skillsInput = byId("profile-skills-input");

  const emailInput = byId("profile-email-input");
  const socialsInput = byId("profile-socials-input");
  const websiteInput = byId("profile-website-input");
  const phoneInput = byId("profile-phone-input");

  if (nameInput) nameInput.value = currentUser.name || "";
  if (usernameInput) usernameInput.value = currentUser.username || "";
  if (dobInput) dobInput.value = currentUser.dateOfBirth || "";
  if (bioInput) bioInput.value = currentUser.bio || "";
  if (picInput) picInput.value = currentUser.profilePicUrl || "";
  if (skillsInput) skillsInput.value = (currentUser.skills || []).join(", ");

  if (emailInput) emailInput.value = currentUser.contact?.email || (authUser.email || "");
  if (socialsInput) socialsInput.value = currentUser.contact?.socials || "";
  if (websiteInput) websiteInput.value = currentUser.contact?.website || "";
  if (phoneInput) phoneInput.value = currentUser.contact?.phone || "";

  // Save profile
  const profileForm = byId("profile-form");
  const profileMsg = byId("profile-save-message");

  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const next = {
        name: nameInput?.value.trim() || "",
        username: usernameInput?.value.trim() || "",
        dateOfBirth: dobInput?.value || "",
        bio: bioInput?.value.trim() || "",
        profilePicUrl: picInput?.value.trim() || "",
        skills: normalizeSkills(skillsInput?.value || ""),
        contact: {
          email: emailInput?.value.trim() || "",
          socials: socialsInput?.value.trim() || "",
          website: websiteInput?.value.trim() || "",
          phone: phoneInput?.value.trim() || ""
        }
      };

      try {
        await updateDoc(doc(db, "users", currentUser.id), next);
        currentUser = { ...currentUser, ...next };
        setMessage(profileMsg, "Profile saved.", "ok");
        setTimeout(() => setMessage(profileMsg, ""), 1800);
      } catch (err) {
        console.error(err);
        setMessage(profileMsg, "Error saving profile. Check console.", "error");
      }
    });
  }

  // Projects
  const listEl = byId("project-list");
  const newForm = byId("new-project-form");
  const newTitle = byId("new-project-title");
  const newDesc = byId("new-project-description");
  const newLink = byId("new-project-link");
  const projMsg = byId("project-save-message");

  function renderProjectList() {
    if (!listEl) return;
    listEl.innerHTML = "";

    const projects = currentUser.projects || [];
    if (projects.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<p class="muted">No projects yet.</p>`;
      listEl.appendChild(empty);
      return;
    }

    projects.forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "project-list-item";
      item.innerHTML = `
        <div class="project-list-item-header">
          <div class="project-list-item-title">${p.title || ""}</div>
          <button type="button" class="pill pill-danger" data-del="${idx}">Delete</button>
        </div>
        <div class="project-list-item-desc">${p.description || ""}</div>
        ${p.link
          ? `<a class="text-link" href="${p.link}" target="_blank" rel="noreferrer">${p.link}</a>`
          : `<span class="tiny muted">No link provided</span>`
        }
      `;
      listEl.appendChild(item);
    });

    listEl.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const i = Number(btn.getAttribute("data-del"));
        currentUser.projects.splice(i, 1);

        try {
          await updateDoc(doc(db, "users", currentUser.id), { projects: currentUser.projects });
          renderProjectList();
          setMessage(projMsg, "Project deleted.", "ok");
          setTimeout(() => setMessage(projMsg, ""), 1200);
        } catch (err) {
          console.error(err);
          setMessage(projMsg, "Error deleting project.", "error");
        }
      });
    });
  }

  renderProjectList();

  if (newForm) {
    newForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = newTitle?.value.trim() || "";
      const description = newDesc?.value.trim() || "";
      const link = newLink?.value.trim() || "";

      if (!title || !description) return;

      currentUser.projects = currentUser.projects || [];
      currentUser.projects.push({ title, description, link });

      try {
        await updateDoc(doc(db, "users", currentUser.id), { projects: currentUser.projects });
        renderProjectList();

        if (newTitle) newTitle.value = "";
        if (newDesc) newDesc.value = "";
        if (newLink) newLink.value = "";

        setMessage(projMsg, "Project added.", "ok");
        setTimeout(() => setMessage(projMsg, ""), 1200);
      } catch (err) {
        console.error(err);
        setMessage(projMsg, "Error adding project.", "error");
      }
    });
  }

  // Delete account
  const delBtn = byId("delete-account-btn");
  const delPass = byId("delete-password");
  const delMsg = byId("delete-message");

  if (delBtn) {
    delBtn.addEventListener("click", async () => {
      if (!confirm("Delete your account permanently? This cannot be undone.")) return;

      try {
        await deleteDoc(doc(db, "users", currentUser.id));
        await deleteUser(auth.currentUser);
        window.location.href = "index.html";
      } catch (err) {
        console.error(err);

        // Needs recent login
        if (String(err?.code).includes("requires-recent-login")) {
          const password = delPass?.value || "";
          if (!password) {
            setMessage(delMsg, "Enter your password to confirm deletion.", "error");
            return;
          }

          try {
            const cred = EmailAuthProvider.credential(authUser.email, password);
            await reauthenticateWithCredential(auth.currentUser, cred);
            await deleteDoc(doc(db, "users", currentUser.id));
            await deleteUser(auth.currentUser);
            window.location.href = "index.html";
          } catch (e2) {
            console.error(e2);
            setMessage(delMsg, "Reauthentication failed. Check password.", "error");
          }
          return;
        }

        setMessage(delMsg, "Delete failed. Check console.", "error");
      }
    });
  }
}

// =========================
// Init: Search
// =========================
async function initSearchPage() {
  const input = byId("search-input");
  const type = byId("search-type");
  const results = byId("search-results");
  const count = byId("search-count");
  if (!input || !type || !results || !count) return;

  let cachedUsers = [];
  try {
    const snap = await getDocs(collection(db, "users"));
    cachedUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(err);
    count.textContent = "Error loading users.";
    return;
  }

  function renderUsers(q) {
    const query = q.toLowerCase();
    results.innerHTML = "";
    if (!query) { count.textContent = "Start typing to see user results."; return; }

    const matches = cachedUsers.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return name.includes(query) || username.includes(query);
    });

    if (matches.length === 0) { count.textContent = "No users found."; return; }
    count.textContent = `${matches.length} user(s) found.`;

    matches.forEach((u) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-main">
          <div class="result-title">${u.name || "Unnamed user"}</div>
          <div class="result-subtitle">${u.username ? "@" + u.username : "No username"}</div>
          <div class="tiny muted">Projects: ${(u.projects || []).length}</div>
        </div>
        <div class="result-actions">
          <a class="btn btn-ghost btn-sm" href="index.html?uid=${u.id}">Open profile</a>
        </div>
      `;
      results.appendChild(card);
    });
  }

  function renderProjects(q) {
    const query = q.toLowerCase();
    results.innerHTML = "";
    if (!query) { count.textContent = "Start typing to see project results."; return; }

    const all = [];
    cachedUsers.forEach((u) => (u.projects || []).forEach((p) => all.push({ u, p })));

    const matches = all.filter(({ u, p }) => {
      const title = (p.title || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const owner = (u.name || "").toLowerCase();
      return title.includes(query) || desc.includes(query) || owner.includes(query);
    });

    if (matches.length === 0) { count.textContent = "No projects found."; return; }
    count.textContent = `${matches.length} project(s) found.`;

    matches.forEach(({ u, p }) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-main">
          <div class="result-title">${p.title || "Untitled project"}</div>
          <div class="result-subtitle">${p.description || ""}</div>
          <div class="tiny muted">Owner: ${u.name || "Unnamed user"} ${u.username ? "(@" + u.username + ")" : ""}</div>
        </div>
        <div class="result-actions">
          <a class="btn btn-ghost btn-sm" href="index.html?uid=${u.id}">Owner profile</a>
          ${p.link ? `<a class="btn btn-primary btn-sm" href="${p.link}" target="_blank" rel="noreferrer">Open link</a>` : ""}
        </div>
      `;
      results.appendChild(card);
    });
  }

  function handle() {
    const q = input.value.trim();
    if (type.value === "users") renderUsers(q);
    else renderProjects(q);
  }

  input.addEventListener("input", handle);
  type.addEventListener("change", handle);
  handle();
}

// =========================
// Init: Auth page (tabs + show/hide + strength)
// =========================
function initAuthPageUI() {
  const tabs = document.querySelectorAll(".tab[data-tab]");
  const panels = document.querySelectorAll(".tab-panel[data-panel]");

  function openTab(name) {
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === name));
    panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== name));
  }

  tabs.forEach((t) => t.addEventListener("click", () => openTab(t.dataset.tab)));
  openTab("login");

  // show/hide password
  document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-toggle");
      const input = byId(id);
      if (!input) return;
      const isPass = input.type === "password";
      input.type = isPass ? "text" : "password";
      btn.textContent = isPass ? "Hide" : "Show";
    });
  });

  // strength
  const pass = byId("register-password");
  const bar = byId("strength-bar");
  const text = byId("strength-text");

  function scorePassword(p) {
    let s = 0;
    if (!p) return 0;
    if (p.length >= 8) s += 1;
    if (p.length >= 12) s += 1;
    if (/[A-Z]/.test(p)) s += 1;
    if (/[a-z]/.test(p)) s += 1;
    if (/[0-9]/.test(p)) s += 1;
    if (/[^A-Za-z0-9]/.test(p)) s += 1;
    return Math.min(s, 6);
  }

  if (pass && bar && text) {
    pass.addEventListener("input", () => {
      const s = scorePassword(pass.value);
      bar.style.width = `${(s / 6) * 100}%`;

      if (s <= 2) text.textContent = "Weak: add length + numbers.";
      else if (s <= 4) text.textContent = "Good: add uppercase or symbols.";
      else text.textContent = "Strong password ✅";
    });
  }
}

// =========================
// Init: Login/Register logic
// =========================
function initLoginLogic() {
  const loginForm = byId("login-form");
  const loginEmail = byId("login-email");
  const loginPassword = byId("login-password");
  const loginMsg = byId("login-message");

  const regForm = byId("register-form");
  const regName = byId("register-name");
  const regUser = byId("register-username");
  const regEmail = byId("register-email");
  const regPass = byId("register-password");
  const regMsg = byId("register-message");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
        setMessage(loginMsg, "Login successful. Redirecting…", "ok");
        setTimeout(() => (window.location.href = "dashboard.html"), 350);
      } catch (err) {
        console.error(err);
        setMessage(loginMsg, "Invalid email or password.", "error");
      }
    });
  }

  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = regName.value.trim();
      const username = regUser.value.trim();
      const email = regEmail.value.trim();
      const password = regPass.value;

      if (!name || !email || !password) {
        setMessage(regMsg, "Please fill in all required fields.", "error");
        return;
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        await setDoc(doc(db, "users", uid), {
          name,
          username,
          dateOfBirth: "",
          bio: "",
          profilePicUrl: "",
          projects: [],
          skills: [],
          contact: { email, socials: "", website: "", phone: "" }
        });

        setMessage(regMsg, "Account created. Opening dashboard…", "ok");
        setTimeout(() => (window.location.href = "dashboard.html"), 450);
      } catch (err) {
        console.error(err);
        setMessage(regMsg, "Registration failed. Email may already be used.", "error");
      }
    });
  }
}

// =========================
// Page Router
// =========================
async function runPage() {
  const page = document.body?.dataset?.page || "";

  if (page === "auth") {
    initAuthPageUI();
    initLoginLogic();
    return;
  }

  if (page === "dashboard") {
    await initDashboardPage();
    return;
  }

  if (page === "search") {
    await initSearchPage();
    return;
  }

  if (page === "profile") {
    await initProfilePage();
    return;
  }

  // criteria page doesn't require JS besides nav auth state
}

// =========================
// Boot
// =========================
wireLogout();

onAuthStateChanged(auth, async (user) => {
  authUser = user || null;
  updateNav(authUser);
  await runPage();
});