// ============================
// Data & Defaults
// ============================
const translations = {
  en: { title: "Digital Learning Platform", subtitle: "For Rural School Students in Nabha" },
  hi: { title: "डिजिटल लर्निंग प्लेटफ़ॉर्म", subtitle: "नाभा के ग्रामीण छात्रों के लिए" },
  pa: { title: "ਡਿਜਿਟਲ ਲਰਨਿੰਗ ਪਲੇਟਫਾਰਮ", subtitle: "ਨਭਾ ਦੇ ਪਿੰਡਾਂ ਦੇ ਵਿਦਿਆਰਥੀਆਂ ਲਈ" }
};

// persistent storage keys
const STORAGE = {
  USERS: "dlp_users_v1",
  COURSES: "dlp_courses_v1",
  PROGRESS: "dlp_progress_v1",
  LEADERBOARD: "dlp_leaderboard_v1",
  TRAININGS: "dlp_trainings_v1",
  NOTIFICATIONS: "dlp_notifications_v1",
  BADGES: "dlp_badges_v1",
  DARK: "dlp_dark_v1"
};

// load or defaults
let users = JSON.parse(localStorage.getItem(STORAGE.USERS)) || [];
let courses = JSON.parse(localStorage.getItem(STORAGE.COURSES)) || [
  { id:"course1", name:"Computer Basics", link:"https://youtu.be/wbJcJCkBcMg" },
  { id:"course2", name:"Mathematics for School Students", link:"https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
];
let progress = JSON.parse(localStorage.getItem(STORAGE.PROGRESS)) || {}; // { courseId: true } for current user quick flag
let leaderboard = JSON.parse(localStorage.getItem(STORAGE.LEADERBOARD)) || { math:[], science:[], english:[], gk:[], history:[], geography:[] };
let trainingResources = JSON.parse(localStorage.getItem(STORAGE.TRAININGS)) || [];
let notifications = JSON.parse(localStorage.getItem(STORAGE.NOTIFICATIONS)) || [];
let badges = JSON.parse(localStorage.getItem(STORAGE.BADGES)) || {}; // { username: ["Starter", ...] }

let currentUser = null; // { username, role }

// ============================
// UI helpers & startup
// ============================
function $(id){ return document.getElementById(id); }
function saveAll(){ localStorage.setItem(STORAGE.COURSES, JSON.stringify(courses)); localStorage.setItem(STORAGE.PROGRESS, JSON.stringify(progress)); localStorage.setItem(STORAGE.USERS, JSON.stringify(users)); localStorage.setItem(STORAGE.LEADERBOARD, JSON.stringify(leaderboard)); localStorage.setItem(STORAGE.TRAININGS, JSON.stringify(trainingResources)); localStorage.setItem(STORAGE.NOTIFICATIONS, JSON.stringify(notifications)); localStorage.setItem(STORAGE.BADGES, JSON.stringify(badges)); }

function showSection(sectionId){
  document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
  const target = document.getElementById(sectionId);
  if(!target) return;
  target.classList.add("active");
  document.querySelectorAll("nav ul li a").forEach(a=>a.classList.remove("active"));
  const navEl = document.getElementById("nav-"+sectionId);
  if(navEl) navEl.classList.add("active");

  // run view-specific renderers
  if(sectionId==="courses") renderCourses();
  if(sectionId==="profile") renderProfile();
  if(sectionId==="teacher") showTeacherDashboard();
  if(sectionId==="parent") updateParentDashboard();
  if(sectionId==="notifications") renderNotifications();
  if(sectionId==="quiz") updateLeaderboard();
}

// language
function changeLanguage(lang){
  const t = translations[lang] || translations.en;
  document.title = t.title;
  $("page-title").innerText = t.title;
  $("page-subtitle").innerText = t.subtitle;
}

// ============================
// Dark mode
// ============================
const darkToggle = $("dark-mode-toggle");
darkToggle.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem(STORAGE.DARK, document.body.classList.contains("dark"));
});
if(localStorage.getItem(STORAGE.DARK) === "true") document.body.classList.add("dark");

// ============================
// Courses rendering & management
// ============================
function renderCourses(){
  const list = $("courses-list");
  list.innerHTML = "";
  courses.forEach(c=>{
    const li = document.createElement("li");
    li.id = c.id;
    if(progress[c.id]) li.classList.add("completed");
    const metaDiv = document.createElement("div");
    metaDiv.className = "course-meta";
    metaDiv.innerHTML = `📘 <span style="font-weight:600;">${c.name}</span>`;
    const actions = document.createElement("div");
    actions.className = "course-actions";

    const openBtn = document.createElement("a");
    openBtn.href = c.link; openBtn.target="_blank"; openBtn.innerText = "[Open Resource]";
    openBtn.onclick = (e)=>{ markCompleted(c.id); }; // mark completed when they click the resource
    actions.appendChild(openBtn);

    const progressLabel = document.createElement("span");
    progressLabel.innerText = progress[c.id] ? "✅ Completed" : "❌ Not Completed";
    progressLabel.style.marginLeft = "8px";
    actions.appendChild(progressLabel);

    if(currentUser && currentUser.role === "teacher"){
      const markBtn = document.createElement("button");
      markBtn.innerText = "Mark Student Completed";
      markBtn.onclick = ()=>{ alert("Use the Teacher Dashboard to mark specific students' progress."); showSection("teacher"); };
      actions.appendChild(markBtn);
    }

    li.appendChild(metaDiv);
    li.appendChild(actions);
    list.appendChild(li);
  });

  // show admin form if admin logged in
  if(currentUser && currentUser.role === "admin"){
    $("admin-course-form").classList.remove("hidden");
  } else {
    $("admin-course-form").classList.add("hidden");
  }
}

function searchCourses(){
  const term = $("course-search").value.toLowerCase();
  document.querySelectorAll("#courses-list li").forEach(li=>{
    li.style.display = li.innerText.toLowerCase().includes(term) ? "flex" : "none";
  });
}

function addNewCourse(){
  const name = $("new-course-name").value.trim();
  const link = $("new-course-link").value.trim();
  if(!name || !link) return alert("Enter course name and link");
  const newCourse = { id: "course"+(courses.length+1), name, link };
  courses.push(newCourse);
  saveAll();
  renderCourses();
  $("new-course-name").value=""; $("new-course-link").value="";
  alert("Course added successfully!");
}

// mark completed for current user quick mode
function markCompleted(courseId){
  if(!courseId) return;
  progress[courseId] = true;
  // award badge for first course completion
  if(currentUser) awardBadge(currentUser.username, "Course Finisher");
  saveAll();
  renderCourses();
  updateParentDashboard();
}

// ============================
// Login / Users
// ============================
function handleLogin(evt){
  evt.preventDefault();
  const role = $("role").value;
  const username = $("username").value.trim();
  const password = $("password").value.trim();
  if(!username || !password) return alert("Enter username & password");

  let userIndex = users.findIndex(u => u.username === username);
  if(userIndex === -1){
    // register new
    users.push({ username, password, role });
    localStorage.setItem(STORAGE.USERS, JSON.stringify(users));
    alert(`New ${role} registered successfully!`);
  } else {
    if(users[userIndex].password !== password){
      return alert("Incorrect password");
    }
  }

  currentUser = { username, role };
  $("logout-btn").style.display = "inline-block";
  // show admin form if admin
  if(role === "admin") $("admin-course-form").classList.remove("hidden");
  else $("admin-course-form").classList.add("hidden");

  if(role === "parent") updateParentDashboard();
  if(role === "teacher") showTeacherDashboard();

  showSection("courses");
  renderProfile();
  awardBadge(username, "Welcome Badge");
}

// logout
function logout(){
  currentUser = null;
  $("logout-btn").style.display = "none";
  showSection("welcome");
  alert("Logged out");
}

// ============================
// Certificates (canvas PNG generation)
// ============================
function generateCertificate(){
  if(!currentUser) return alert("Login as a student to generate a certificate.");
  const canvas = $("certificateCanvas");
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // decorative header
  ctx.fillStyle = "#2e8b57";
  ctx.fillRect(0,0,canvas.width,120);
  ctx.fillStyle = "#fff";
  ctx.font = "38px Arial";
  ctx.fillText("Certificate of Completion", 40, 75);

  // name and body
  ctx.fillStyle = "#111";
  ctx.font = "28px Arial";
  ctx.fillText(`This certifies that`, 40, 200);
  ctx.font = "48px Georgia";
  ctx.fillText(`${currentUser.username}`, 40, 260);

  ctx.font = "24px Arial";
  const completed = Object.keys(progress).filter(id => progress[id]);
  const coursesText = completed.length ? completed.map(id => courses.find(c=>c.id===id)?.name || id).join(", ") : "No courses completed yet";
  wrapText(ctx, `Has successfully completed: ${coursesText}`, 40, 330, canvas.width-80, 26);

  // footer
  ctx.font = "18px Arial";
  ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 40, canvas.height-80);
  ctx.fillText("Digital Learning Platform - Nabha", 40, canvas.height-50);

  // small seal
  ctx.beginPath();
  ctx.arc(canvas.width-140, canvas.height-120, 60, 0, Math.PI*2);
  ctx.fillStyle = "#ffd700";
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.font = "16px Arial";
  ctx.fillText("Verified", canvas.width-170, canvas.height-115);

  // show canvas
  canvas.style.display = "block";
  alert("Certificate generated on the profile page. Click 'Download Certificate PNG' to save it.");
}

// helper for long text on canvas
function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = text.split(" ");
  let line = "";
  for(let n=0;n<words.length;n++){
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if(metrics.width > maxWidth && n>0){
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function downloadCertificatePNG(){
  const canvas = $("certificateCanvas");
  if(!canvas) return alert("Please generate the certificate first.");
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `certificate_${currentUser?currentUser.username:"guest"}.png`;
  link.click();
}

// download multiple (simple text certificates) - just as a helper to export
function downloadAllCertificates(){
  if(!currentUser) return alert("Login as student to download certificate.");
  const completed = Object.keys(progress).filter(id=>progress[id]);
  if(completed.length === 0) return alert("No completed courses to create certificates for.");
  const text = `Certificates for ${currentUser.username}\nCompleted: ${completed.join(", ")}\nDate: ${new Date().toLocaleString()}`;
  const blob = new Blob([text], { type:"text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `certificates_${currentUser.username}.txt`;
  a.click();
}

// ============================
// Quizzes & Leaderboard
// ============================
const quizzes = {
  math: [{ q:"5+3=?", options:["6","8","9"], answer:"8" }],
  science: [{ q:"Red Planet?", options:["Earth","Mars"], answer:"Mars" }],
  english: [{ q:"Plural of 'child'?", options:["Childs","Children"], answer:"Children" }],
  gk: [{ q:"National bird of India?", options:["Peacock","Parrot"], answer:"Peacock" }],
  history: [{ q:"Who was first President of India?", options:["Rajendra Prasad","Nehru"], answer:"Rajendra Prasad" }],
  geography: [{ q:"Largest ocean?", options:["Atlantic","Pacific"], answer:"Pacific" }]
};
let currentQuiz = [], currentSubject = "", currentIndex = 0, score = 0;

function startSubjectQuiz(subject){
  currentQuiz = quizzes[subject] ? [...quizzes[subject]] : [];
  if(currentQuiz.length === 0) return alert("No questions available for this subject yet.");
  currentSubject = subject; currentIndex = 0; score = 0;
  $("quiz-container").style.display = "block";
  $("quiz-result").innerText = "";
  showQuestion();
}

function showQuestion(){
  if(currentIndex < currentQuiz.length){
    const q = currentQuiz[currentIndex];
    $("quiz-question").innerText = `(${currentSubject.toUpperCase()}) ${q.q}`;
    const optionsDiv = $("quiz-options");
    optionsDiv.innerHTML = "";
    q.options.forEach(opt=>{
      const btn = document.createElement("button");
      btn.innerText = opt;
      btn.onclick = ()=>checkAnswer(opt);
      optionsDiv.appendChild(btn);
    });
    $("quiz-progress").innerText = `Question ${currentIndex+1} of ${currentQuiz.length}`;
  } else endQuiz();
}

function checkAnswer(selected){
  if(selected === currentQuiz[currentIndex].answer) score++;
  currentIndex++; showQuestion();
}

function endQuiz(){
  $("quiz-question").innerText = "";
  $("quiz-options").innerHTML = "";
  $("quiz-progress").innerText = "";
  $("quiz-result").innerText = `You scored ${score} / ${currentQuiz.length}`;
  const name = currentUser ? currentUser.username : prompt("Enter your name:");
  if(name){
    if(!leaderboard[currentSubject]) leaderboard[currentSubject] = [];
    leaderboard[currentSubject].push({ name, score });
    leaderboard[currentSubject].sort((a,b)=>b.score - a.score);
    localStorage.setItem(STORAGE.LEADERBOARD, JSON.stringify(leaderboard));
    // award badge for good score
    if(currentUser && score === currentQuiz.length) awardBadge(currentUser.username, "Quiz Master");
  }
  updateLeaderboard();
}

function updateLeaderboard(){
  const lbDiv = $("leaderboard");
  lbDiv.innerHTML = "";
  Object.keys(leaderboard).forEach(subj=>{
    if(leaderboard[subj].length > 0){
      const div = document.createElement("div");
      div.innerHTML = `<h4>${subj.toUpperCase()}</h4>`;
      leaderboard[subj].slice(0,5).forEach(e=>{
        div.innerHTML += `<p>${e.name} - ${e.score}</p>`;
      });
      lbDiv.appendChild(div);
    }
  });
}
updateLeaderboard();

// ============================
// Badges
// ============================
function awardBadge(username, badgeName){
  if(!username) return;
  badges = JSON.parse(localStorage.getItem(STORAGE.BADGES)) || {};
  if(!badges[username]) badges[username] = [];
  if(!badges[username].includes(badgeName)){
    badges[username].push(badgeName);
    localStorage.setItem(STORAGE.BADGES, JSON.stringify(badges));
  }
  renderProfile();
}

// ============================
// Parent Dashboard
// ============================
function updateParentDashboard(){
  if(!currentUser || currentUser.role !== "parent") return;
  const div = $("parent-progress");
  div.innerHTML = "";
  courses.forEach(c=>{
    // show aggregated studentProgress if any
    const studentProgress = JSON.parse(localStorage.getItem("studentProgress")) || {};
    let completed = (progress[c.id] || false) ? "✅ Completed" : "❌ Not Completed";
    // if parent has children username mapping stored, we could show more — kept simple
    div.innerHTML += `<p>${c.name}: ${completed}</p>`;
  });
}

// ============================
// Teacher Dashboard
// ============================
function showTeacherDashboard(){
  if(!currentUser || currentUser.role !== "teacher") return;
  const div = $("teacher-student-list");
  div.innerHTML = "";
  const students = users.filter(u=>u.role === "student");
  if(students.length === 0) div.innerHTML = "<p>No students registered yet.</p>";
  students.forEach(s=>{
    const p = document.createElement("p");
    p.innerHTML = `${s.username} <button onclick="markStudentProgress('${s.username}')">Mark Course Completed</button>`;
    div.appendChild(p);
  });
  renderTeacherTrainingResources();
}

function markStudentProgress(studentName){
  const courseId = prompt("Enter course ID to mark as completed (e.g., course1):");
  if(!courseId || !courses.find(c=>c.id===courseId)) return alert("Invalid course ID");
  let studentProgress = JSON.parse(localStorage.getItem("studentProgress")) || {};
  if(!studentProgress[studentName]) studentProgress[studentName] = {};
  studentProgress[studentName][courseId] = true;
  localStorage.setItem("studentProgress", JSON.stringify(studentProgress));
  alert(`Course ${courseId} marked completed for ${studentName}`);
}

// training resources
function addTrainingResource(){
  const title = $("training-title").value.trim();
  const link = $("training-link").value.trim();
  if(!title || !link) return alert("Enter title and link");
  trainingResources.push({ title, link });
  localStorage.setItem(STORAGE.TRAININGS, JSON.stringify(trainingResources));
  renderTeacherTrainingResources();
  $("training-title").value = ""; $("training-link").value = "";
}

function renderTeacherTrainingResources(){
  const list = $("teacher-training-list");
  list.innerHTML = "";
  trainingResources.forEach(r=>{
    const li = document.createElement("li");
    li.innerHTML = `${r.title} - <a href="${r.link}" target="_blank">View</a>`;
    list.appendChild(li);
  });
}

// ============================
// Notifications
// ============================
function postNotification(){
  const text = $("notification-text").value.trim();
  if(!text) return alert("Enter a message to post.");
  if(!currentUser || (currentUser.role !== "teacher" && currentUser.role !== "admin")) return alert("Only teachers or admins can post announcements.");
  notifications.unshift({ text, author: currentUser.username, date: new Date().toLocaleString() });
  localStorage.setItem(STORAGE.NOTIFICATIONS, JSON.stringify(notifications));
  $("notification-text").value = "";
  renderNotifications();
  alert("Announcement posted.");
}

function renderNotifications(){
  const list = $("notification-list");
  list.innerHTML = "";
  notifications.forEach(n=>{
    const p = document.createElement("p");
    p.innerText = `${n.date} — ${n.author}: ${n.text}`;
    list.appendChild(p);
  });
}

// ============================
// Profile view
// ============================
function renderProfile(){
  if(!currentUser) return $("profile-info").innerHTML = "<p>Login to see your profile.</p>";
  const info = $("profile-info");
  const userBadges = (JSON.parse(localStorage.getItem(STORAGE.BADGES)) || {})[currentUser.username] || [];
  const completed = Object.keys(progress).filter(id=>progress[id]).map(id=> courses.find(c=>c.id===id)?.name || id);

  info.innerHTML = `
    <p><b>Username:</b> ${currentUser.username}</p>
    <p><b>Role:</b> ${currentUser.role}</p>
    <h4>Completed Courses</h4>
    <div id="completed-courses">${completed.length ? completed.map(n=>`<div style="padding:8px;background:#fff;border-radius:6px;margin-bottom:6px;">${n}</div>`).join("") : "<div>No completed courses yet.</div>"}</div>
  `;

  const badgeList = $("badge-list");
  badgeList.innerHTML = "";
  userBadges.forEach(b=>{
    const span = document.createElement("span");
    span.className = "badge";
    span.innerText = b;
    badgeList.appendChild(span);
  });
}

// ============================
// Init
// ============================
function init(){
  // map IDs that changed from original code
  if(!window.location) window.location = {};
  renderCourses();
  renderTeacherTrainingResources();
  renderNotifications();

  // wire nav profile button
  $("profile-btn").addEventListener("click", ()=> showSection("profile"));

  // show/hide logout link based on session
  if(currentUser) $("logout-btn").style.display = "inline-block";

  // simple sample: award a "Welcome" badge to new users
  // (we award on login)
  // initial render of profile if logged in (remember: currentUser is not persisted across reload in this simple design)
  renderProfile();
}
init();
