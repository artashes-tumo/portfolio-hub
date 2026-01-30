// =========================
// Firebase setup
// =========================
// 1) In ALL HTML files, include:
//    <script type="module" src="script.js"></script>
// 2) Replace firebaseConfig values with your real config from Firebase console.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBDx0su4MasNevrb8HfMjxceF8lbSGiiPI",
  authDomain: "portfolio-hub-72601.firebaseapp.com",
  projectId: "portfolio-hub-72601",
  storageBucket: "portfolio-hub-72601.appspot.com", // ✅ FIXED
    messagingSenderId: "4260516904",
  appId: "1:4260516904:web:35985d773575490cf8511d"
};

console.log("Firebase config loaded:", firebaseConfig);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global profile object for the currently logged-in user
let currentUser = null;

// =========================
// Helper: load current user's profile from Firestore
// =========================

async function loadCurrentUserProfile(uid, userEmail) {
  const userDocRef = doc(db, "users", uid);
  const snap = await getDoc(userDocRef);

  if (!snap.exists()) {
    const defaultData = {
      name: userEmail || "New user",
      username: "",
      dateOfBirth: "",
      bio: "",
      profilePicUrl: null,
      projects: [],
      skills: [],
      contact: {
        email: userEmail || "",
        socials: "",
        website: "",
        phone: ""
      }
    };
    await setDoc(userDocRef, defaultData);
    currentUser = { id: uid, ...defaultData };
  } else {
    currentUser = { id: uid, ...snap.data() };
  }

  updateDashboardHeader();
}

// =========================
// Rendering: public profile page
// =========================

function renderProfile(user) {
  const nameEl = document.querySelector(".profile-name");
  const usernameEl = document.querySelector(".profile-username");
  const dobEl = document.querySelector(".profile-dob span");
  const bioEl = document.querySelector(".profile-bio");
  const picPlaceholder = document.querySelector(".profile-pic-placeholder");

  if (!user) return;

  if (nameEl) nameEl.textContent = user.name || "Unnamed user";
  if (usernameEl) usernameEl.textContent = user.username ? `@${user.username}` : "";
  if (dobEl) dobEl.textContent = user.dateOfBirth || "Not provided";
  if (bioEl) bioEl.textContent = user.bio || "";

  if (picPlaceholder) {
    picPlaceholder.innerHTML = "IMG";
    if (user.profilePicUrl) {
      const img = document.createElement("img");
      img.src = user.profilePicUrl;
      img.alt = `${user.name}'s profile picture`;
      img.classList.add("profile-pic-img");
      picPlaceholder.innerHTML = "";
      picPlaceholder.appendChild(img);
    }
  }
}

function renderProjects(user) {
  const projectsContainer = document.querySelector(".projects-grid");
  if (!projectsContainer || !user) return;

  projectsContainer.innerHTML = "";

  (user.projects || []).forEach(project => {
    const card = document.createElement("article");
    card.classList.add("project-card");

    card.innerHTML = `
      <h3 class="project-title">${project.title}</h3>
      <p class="project-description">
        ${project.description}
      </p>
      ${project.link
        ? `<a href="${project.link}" target="_blank" class="project-link">View project</a>`
        : ""
      }
    `;

    projectsContainer.appendChild(card);
  });
}

function renderSkills(user) {
  const skillsList = document.querySelector(".skills-section ul");
  if (!skillsList || !user) return;

  skillsList.innerHTML = "";

  (user.skills || []).forEach(skill => {
    const li = document.createElement("li");
    li.textContent = skill;
    skillsList.appendChild(li);
  });
}

function renderContact(user) {
  const contactList = document.querySelector(".contact-list");
  if (!contactList || !user) return;

  contactList.innerHTML = "";

  const contact = user.contact || {};
  const { email, socials, website, phone } = contact;

  if (email) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Email:</strong> ${email}`;
    contactList.appendChild(li);
  }

  if (socials) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Socials:</strong> ${socials}`;
    contactList.appendChild(li);
  }

  if (website) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Website:</strong> <a href="${website}" target="_blank">${website}</a>`;
    contactList.appendChild(li);
  }

  if (phone) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Phone:</strong> ${phone}`;
    contactList.appendChild(li);
  }
}

function updateDashboardHeader() {
  const label = document.getElementById("dashboard-current-user");
  if (label && currentUser) {
    label.textContent = `${currentUser.name || "Unnamed"} (${currentUser.username || "no username"})`;
  }
}

// =========================
// Dashboard: edit profile & projects
// =========================

function initDashboardPage() {
  if (!currentUser) return;

  const profileForm = document.getElementById("profile-form");
  const nameInput = document.getElementById("profile-name-input");
  const usernameInput = document.getElementById("profile-username-input");
  const dobInput = document.getElementById("profile-dob-input");
  const bioInput = document.getElementById("profile-bio-input");
  const emailInput = document.getElementById("profile-email-input");
  const socialsInput = document.getElementById("profile-socials-input");
  const websiteInput = document.getElementById("profile-website-input");
  const phoneInput = document.getElementById("profile-phone-input");
  const profileSaveMessage = document.getElementById("profile-save-message");

  const projectList = document.getElementById("project-list");
  const newProjectForm = document.getElementById("new-project-form");
  const newProjectTitle = document.getElementById("new-project-title");
  const newProjectDescription = document.getElementById("new-project-description");
  const newProjectLink = document.getElementById("new-project-link");
  const projectSaveMessage = document.getElementById("project-save-message");

  if (!profileForm || !projectList) return;

  // Prefill profile form from currentUser
  nameInput.value = currentUser.name || "";
  usernameInput.value = currentUser.username || "";
  dobInput.value = currentUser.dateOfBirth || "";
  bioInput.value = currentUser.bio || "";
  emailInput.value = currentUser.contact?.email || "";
  socialsInput.value = currentUser.contact?.socials || "";
  websiteInput.value = currentUser.contact?.website || "";
  phoneInput.value = currentUser.contact?.phone || "";

  // Render project list (dashboard view)
  function renderProjectList() {
    projectList.innerHTML = "";

    (currentUser.projects || []).forEach((project, index) => {
      const item = document.createElement("div");
      item.classList.add("project-list-item");

      item.innerHTML = `
        <div class="project-list-item-header">
          <span class="project-list-item-title">${project.title}</span>
          <button type="button" class="project-delete-btn" data-project-index="${index}">
            Delete
          </button>
        </div>
        <p class="project-list-item-description">${project.description}</p>
        ${project.link
          ? `<a href="${project.link}" target="_blank" class="project-list-item-link">${project.link}</a>`
          : ""
        }
      `;

      projectList.appendChild(item);
    });

    const deleteButtons = projectList.querySelectorAll(".project-delete-btn");
    deleteButtons.forEach(btn => {
      btn.addEventListener("click", async () => {
        const index = Number(btn.getAttribute("data-project-index"));
        if (!Number.isInteger(index)) return;

        currentUser.projects.splice(index, 1);

        try {
          const userDocRef = doc(db, "users", currentUser.id);
          await updateDoc(userDocRef, { projects: currentUser.projects });
          renderProjectList();
          renderProjects(currentUser);
        } catch (err) {
          console.error(err);
          if (projectSaveMessage) {
            projectSaveMessage.textContent = "Error deleting project.";
            projectSaveMessage.style.color = "#dc2626";
          }
        }
      });
    });
  }

  renderProjectList();

  // Save profile
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    currentUser.name = nameInput.value.trim();
    currentUser.username = usernameInput.value.trim() || "";
    currentUser.dateOfBirth = dobInput.value || "";
    currentUser.bio = bioInput.value.trim() || "";
    currentUser.contact = {
      email: emailInput.value.trim() || "",
      socials: socialsInput.value.trim() || "",
      website: websiteInput.value.trim() || "",
      phone: phoneInput.value.trim() || ""
    };

    try {
      const userDocRef = doc(db, "users", currentUser.id);
      await updateDoc(userDocRef, {
        name: currentUser.name,
        username: currentUser.username,
        dateOfBirth: currentUser.dateOfBirth,
        bio: currentUser.bio,
        contact: currentUser.contact
      });

      renderProfile(currentUser);
      renderContact(currentUser);
      updateDashboardHeader();

      if (profileSaveMessage) {
        profileSaveMessage.style.color = "#16a34a";
        profileSaveMessage.textContent = "Profile saved.";
        setTimeout(() => (profileSaveMessage.textContent = ""), 2000);
      }
    } catch (err) {
      console.error(err);
      if (profileSaveMessage) {
        profileSaveMessage.style.color = "#dc2626";
        profileSaveMessage.textContent = "Error saving profile.";
      }
    }
  });

  // Add new project
  newProjectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = newProjectTitle.value.trim();
    const description = newProjectDescription.value.trim();
    const link = newProjectLink.value.trim();

    if (!title || !description) return;

    if (!currentUser.projects) currentUser.projects = [];
    currentUser.projects.push({
      title,
      description,
      link: link || ""
    });

    try {
      const userDocRef = doc(db, "users", currentUser.id);
      await updateDoc(userDocRef, { projects: currentUser.projects });

      renderProjectList();
      renderProjects(currentUser);

      newProjectTitle.value = "";
      newProjectDescription.value = "";
      newProjectLink.value = "";

      if (projectSaveMessage) {
        projectSaveMessage.style.color = "#16a34a";
        projectSaveMessage.textContent = "Project added.";
        setTimeout(() => (projectSaveMessage.textContent = ""), 2000);
      }
    } catch (err) {
      console.error(err);
      if (projectSaveMessage) {
        projectSaveMessage.style.color = "#dc2626";
        projectSaveMessage.textContent = "Error adding project.";
      }
    }
  });

  updateDashboardHeader();
}

// =========================
// Search page (read-only search across all users)
// =========================

async function initSearchPage() {
  const searchInput = document.getElementById("search-input");
  const searchType = document.getElementById("search-type");
  const resultsContainer = document.getElementById("search-results");
  const countEl = document.getElementById("search-count");

  if (!searchInput || !searchType || !resultsContainer || !countEl) return;

  // Load all users once
  let cachedUsers = [];
  try {
    const snap = await getDocs(collection(db, "users"));
    cachedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(err);
    countEl.textContent = "Error loading users.";
    return;
  }

  function renderUserResults(query) {
    const q = query.toLowerCase();
    const matches = cachedUsers.filter(u => {
      const name = (u.name || "").toLowerCase();
      const username = (u.username || "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });

    resultsContainer.innerHTML = "";

    if (!q) {
      countEl.textContent = "Start typing to see user results.";
      return;
    }

    if (matches.length === 0) {
      countEl.textContent = "No users found.";
      return;
    }

    countEl.textContent = `${matches.length} user(s) found.`;

    matches.forEach(user => {
      const card = document.createElement("div");
      card.classList.add("search-result-card");

      const projectCount = (user.projects || []).length;

      card.innerHTML = `
        <div class="search-result-main">
          <div class="search-result-title">${user.name || "Unnamed user"}</div>
          <div class="search-result-subtitle">
            ${user.username ? "@" + user.username : "No username"}
          </div>
          <div class="search-result-meta">
            Projects: ${projectCount}
          </div>
        </div>
      `;

      resultsContainer.appendChild(card);
    });
  }

  function renderProjectResults(query) {
    const q = query.toLowerCase();
    const allProjects = [];

    cachedUsers.forEach(user => {
      (user.projects || []).forEach(project => {
        allProjects.push({ user, project });
      });
    });

    const matches = allProjects.filter(({ project, user }) => {
      const title = (project.title || "").toLowerCase();
      const desc = (project.description || "").toLowerCase();
      const owner = (user.name || "").toLowerCase();
      return title.includes(q) || desc.includes(q) || owner.includes(q);
    });

    resultsContainer.innerHTML = "";

    if (!q) {
      countEl.textContent = "Start typing to see project results.";
      return;
    }

    if (matches.length === 0) {
      countEl.textContent = "No projects found.";
      return;
    }

    countEl.textContent = `${matches.length} project(s) found.`;

    matches.forEach(({ user, project }) => {
      const card = document.createElement("div");
      card.classList.add("search-result-card");

      card.innerHTML = `
        <div class="search-result-main">
          <div class="search-result-title">${project.title}</div>
          <div class="search-result-subtitle">
            ${project.description}
          </div>
          <div class="search-result-meta">
            Owner: ${user.name || "Unnamed user"} ${user.username ? "(" + "@" + user.username + ")" : ""}
          </div>
        </div>
      `;

      resultsContainer.appendChild(card);
    });
  }

  function handleSearch() {
    const query = searchInput.value.trim();
    const type = searchType.value;

    if (type === "users") {
      renderUserResults(query);
    } else {
      renderProjectResults(query);
    }
  }

  searchInput.addEventListener("input", handleSearch);
  searchType.addEventListener("change", handleSearch);

  handleSearch();
}

// =========================
// Login / Register page (Firebase Auth)
// =========================

function initLoginPage() {
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginMessage = document.getElementById("login-message");

  const registerForm = document.getElementById("register-form");
  const registerName = document.getElementById("register-name");
  const registerUsername = document.getElementById("register-username");
  const registerEmail = document.getElementById("register-email");
  const registerPassword = document.getElementById("register-password");
  const registerMessage = document.getElementById("register-message");

  if (!loginForm || !registerForm) return;

  // LOGIN
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (loginMessage) {
        loginMessage.style.color = "#16a34a";
        loginMessage.textContent = "Login successful. Redirecting…";
      }
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    } catch (err) {
      console.error(err);
      if (loginMessage) {
        loginMessage.style.color = "#dc2626";
        loginMessage.textContent = "Invalid email or password.";
      }
    }
  });

  // REGISTER
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = registerName.value.trim();
    const username = registerUsername.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;

    if (!name || !email || !password) {
      if (registerMessage) {
        registerMessage.style.color = "#dc2626";
        registerMessage.textContent = "Please fill in all required fields.";
      }
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
        profilePicUrl: null,
        projects: [],
        skills: [],
        contact: {
          email,
          socials: "",
          website: "",
          phone: ""
        }
      });

      if (registerMessage) {
        registerMessage.style.color = "#16a34a";
        registerMessage.textContent = "Account created. Redirecting to dashboard…";
      }

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 600);
    } catch (err) {
      console.error(err);
      if (registerMessage) {
        registerMessage.style.color = "#dc2626";
        registerMessage.textContent = "Registration failed. Maybe email already used.";
      }
    }
  });
}

// =========================
// Global init
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const profilePage = document.querySelector(".profile-page");
  const dashboardPage = document.querySelector(".dashboard-page");
  const searchPage = document.querySelector(".search-page");
  const loginPage = document.querySelector(".auth-container");

  const loginLink = document.getElementById("login-link");
  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Logged in
      if (loginLink) loginLink.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "inline-block";

      await loadCurrentUserProfile(user.uid, user.email || "");

      if (profilePage) {
        renderProfile(currentUser);
        renderProjects(currentUser);
        renderSkills(currentUser);
        renderContact(currentUser);
      }

      if (dashboardPage) {
        initDashboardPage();
      }

      if (searchPage) {
        await initSearchPage();
      }

      if (loginPage) {
        // Already logged in → no need to show login page
        window.location.href = "index.html";
      }
    } else {
      // Not logged in
      currentUser = null;
      if (loginLink) loginLink.style.display = "inline-block";
      if (logoutBtn) logoutBtn.style.display = "none";

      if (dashboardPage || profilePage) {
        window.location.href = "login.html";
        return;
      }

      if (loginPage) {
        initLoginPage();
      }

      if (searchPage) {
        // Optional: allow anonymous search if rules allow read
        await initSearchPage();
      }
    }
  });
});