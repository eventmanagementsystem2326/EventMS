const EMS_CONFIG = {
  supabaseUrl: "https://oszgllewojvqcbehrtub.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zemdsbGV3b2p2cWNiZWhydHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjYzODIsImV4cCI6MjA4NzYwMjM4Mn0.Doz6ApUcY1HLsAx7HH1EX1Lx0QNLg7R3gl12jLfsmD0",
  storageBucket: "ems-assets"
}

const supabaseClient = window.supabase
  ? window.supabase.createClient(EMS_CONFIG.supabaseUrl, EMS_CONFIG.supabaseKey)
  : null

const page = document.body.dataset.page || ""
const $ = (selector, scope = document) => scope.querySelector(selector)
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)]

function getSession() {
  try { return JSON.parse(sessionStorage.getItem("ems-session") || "null") } catch { return null }
}

function setSession(data) { sessionStorage.setItem("ems-session", JSON.stringify(data)) }
function clearSession() { sessionStorage.removeItem("ems-session") }

function requireRole(role) {
  const session = getSession()
  if (!session || (role && session.role !== role)) window.location.href = "login.html"
}

function requireAnyRole(...roles) {
  const session = getSession()
  if (!session || (roles.length && !roles.includes(session.role))) window.location.href = "login.html"
}

function getDashboardHref(session = getSession()) {
  if (!session) return "login.html"
  return session.role === "student" ? "student-dashboard.html" : "admin-dashboard.html"
}

function isAdminSession(session = getSession()) {
  return session?.role === "admin"
}

function isCoordinatorSession(session = getSession()) {
  return session?.role === "coordinator"
}

function getSessionClub(session = getSession()) {
  return String(session?.club || "").trim()
}

function itemBelongsToClub(clubValue = "", clubName = getSessionClub()) {
  const targetClub = String(clubName || "").trim().toLowerCase()
  if (!targetClub) return true
  return String(clubValue || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(targetClub)
}

function initNav() {
  const session = getSession()
  const current = location.pathname.split("/").pop()
  if (isCoordinatorSession(session)) {
    const adminOnlyLinks = new Set(["manage-homescreen.html", "manage-contacts.html", "manage-options.html", "manage-users.html"])
    $$(".nav-links a[data-nav]").forEach((link) => {
      if (adminOnlyLinks.has(link.getAttribute("href"))) link.remove()
    })
    $$(".brand-copy span").forEach((node) => {
      const currentText = String(node.textContent || "").trim()
      if (currentText) node.textContent = currentText.replace(/Admin/gi, "Coordinator")
    })
    $$(".page-heading .eyebrow").forEach((node) => {
      node.textContent = String(node.textContent || "").replace(/Admin/gi, "Coordinator")
    })
    $(".brand")?.setAttribute("href", "admin-dashboard.html")
  }
  if (isAdminSession(session) && $(".nav-links")) {
    const nav = $(".nav-links")
    const hasUsersLink = nav.querySelector('a[href="manage-users.html"]')
    const logoutLink = nav.querySelector(".logout-link")
    if (!hasUsersLink && logoutLink) {
      logoutLink.insertAdjacentHTML("beforebegin", `<a data-nav href="manage-users.html">Accounts</a>`)
    }
  }
  $$(".nav-links a[data-nav]").forEach((link) => {
    if (link.getAttribute("href") === current) link.classList.add("active")
  })
  $$(".logout-link").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault()
      clearSession()
      window.location.href = "login.html"
    })
  })
}

function showFlash(target, message, type = "success") {
  if (!target) return window.alert(message)
  if (target._flashTimer) {
    window.clearTimeout(target._flashTimer)
    target._flashTimer = null
  }
  target.textContent = message
  target.className = `flash show ${type}`

  if (type === "success") {
    target._flashTimer = window.setTimeout(() => {
      clearFlash(target)
    }, 3500)
  }
}

function clearFlash(target) {
  if (!target) return
  if (target._flashTimer) {
    window.clearTimeout(target._flashTimer)
    target._flashTimer = null
  }
  target.textContent = ""
  target.className = "flash"
}

function safeText(value, fallback = "-") {
  return value === null || value === undefined || value === "" ? fallback : value
}

function isTenDigitPhone(value) {
  return /^\d{10}$/.test(String(value ?? "").trim())
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatMultilineHtml(value, fallback = "-") {
  const text = String(value ?? "").trim()
  if (!text) return escapeHtml(fallback)
  return text
    .split(/\r?\n/)
    .map((line) => escapeHtml(line.trim()))
    .filter(Boolean)
    .join("<br>")
}

function formatNoWrapLinesHtml(value, fallback = "-") {
  const items = splitMultilineValues(value)
  return items.length
    ? items.map((item) => `<div class="nowrap-line">${escapeHtml(item)}</div>`).join("")
    : `<div class="nowrap-line">${escapeHtml(fallback)}</div>`
}

function renderUniqueContactLines(values = []) {
  const seen = new Set()
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase().replace(/[^a-z0-9]+/g, "")
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((value) => `<div class="muted">${formatMultilineHtml(value, "")}</div>`)
    .join("")
}

function splitMultilineValues(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildStudentCoordinatorDisplay(namesValue, classesValue) {
  const names = splitMultilineValues(namesValue)
  const classes = splitMultilineValues(classesValue)
  if (!names.length) return "-"
  return names.map((name, index) => {
    const className = classes[index] || ""
    return className ? `${name} (${className})` : name
  }).join("\n")
}

function formatDate(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateRange(startValue, endValue) {
  if (!endValue || endValue === startValue) return formatDate(startValue)
  return `${formatDate(startValue)} to ${formatDate(endValue)}`
}

function todayISO() { return new Date().toISOString().split("T")[0] }

function parseDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? "").trim())
  if (!match) return null
  const [, yearValue, monthValue, dayValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

function isPastDateValue(value) {
  const date = parseDateInput(value)
  return Boolean(value) && (!date || value < todayISO())
}

function restrictPastDateInput(input, flash, message) {
  if (!input) return
  const syncMin = () => { input.min = todayISO() }
  const clearPastDate = () => {
    syncMin()
    if (!isPastDateValue(input.value)) return
    input.value = ""
    showFlash(flash, message, "error")
  }

  syncMin()
  input.addEventListener("focus", syncMin)
  input.addEventListener("click", syncMin)
  input.addEventListener("input", clearPastDate)
  input.addEventListener("change", clearPastDate)
  input.addEventListener("blur", clearPastDate)
}

function formatTime(value) {
  if (!value) return "-"
  if (!value.includes(":")) return value
  const [h, m] = value.split(":")
  const hour = Number(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`
}

function getEventCutoff(dateValue, timeValue, endDateValue = "") {
  const cutoffDateValue = endDateValue || dateValue
  if (!cutoffDateValue) return null
  const date = parseDateInput(cutoffDateValue)
  if (!date) return new Date(0)

  if (timeValue && timeValue.includes(":")) {
    const [hours, minutes] = timeValue.split(":").map(Number)
    date.setHours(hours || 0, minutes || 0, 0, 0)
  } else {
    // If no time is set, treat the item as ending at the end of that date.
    date.setHours(23, 59, 0, 0)
  }

  date.setMinutes(date.getMinutes() + 30)
  return date
}

function isVisiblePublishedItem(dateValue, timeValue, endDateValue = "") {
  const cutoff = getEventCutoff(dateValue, timeValue, endDateValue)
  if (!cutoff) return true
  return new Date() <= cutoff
}

function daysUntil(value) {
  if (!value) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const date = new Date(value); date.setHours(0, 0, 0, 0)
  return Math.round((date - today) / 86400000)
}

function deadlineLabel(value) {
  const diff = daysUntil(value)
  if (diff === null) return "Schedule to be announced"
  if (diff < 0) return "Completed"
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  return `${diff} days left`
}

function statusFromDate(value) {
  const diff = daysUntil(value)
  return diff !== null && diff >= 0 ? "Open" : "Closed"
}

function statusFromDateRange(startValue, endValue = "") {
  if (endValue && startValue <= todayISO() && todayISO() <= endValue) return "Open"
  return statusFromDate(startValue)
}

function deadlineLabelRange(startValue, endValue = "") {
  if (endValue && startValue < todayISO() && todayISO() <= endValue) return "Ongoing"
  return deadlineLabel(startValue)
}

function dateMatchesRange(selectedDate, startValue, endValue = "") {
  if (!selectedDate) return true
  const lastDate = endValue || startValue
  return selectedDate >= startValue && selectedDate <= lastDate
}

function normalizeEvent(item = {}) {
  return {
    id: item.id,
    theme: item.theme || item.title || "Untitled Event",
    category: item.category || "",
    club: item.club || "",
    date: item.date || item.event_date || "",
    endDate: item.endDate || item.enddate || item.end_date || item.eventEndDate || item.event_end_date || "",
    time: item.time || item.event_time || "",
    venue: item.venue || "",
    resourcePerson: item.resourcePerson || item.resource_person || "",
    facultyCoordinator: item.facultyCoordinator || item.faculty_coordinator || "",
    studentCoordinator: item.studentCoordinator || item.student_coordinator || "",
    audience: item.audience || "",
    description: item.description || item.summary || "",
    brochureLink: item.brochureLink || item.brochure_link || item.file_url || "",
    bannerImage: item.bannerImage || item.banner_image || item.image_url || ""
  }
}

function normalizeCompetition(item = {}) {
  const minTeamLimit = Number(item.min_team_limit || item.minTeamLimit || 0) || 0
  const maxTeamLimit = Number(item.max_team_limit || item.maxTeamLimit || item.team_limit || item.teamLimit || 0) || 0
  return {
    id: item.id,
    theme: item.theme || item.title || "Untitled Competition",
    competition_type: item.competition_type || item.competitionType || "Individual",
    minTeamLimit,
    maxTeamLimit,
    teamLimit: maxTeamLimit,
    category: item.category || "",
    club: item.club || "",
    eventId: item.eventId || item.event_id || item.event_name || "",
    competitionDate: item.competitionDate || item.competition_date || item.date || "",
    competitionEndDate: item.competitionEndDate || item.competitionenddate || item.competition_end_date || item.endDate || item.enddate || item.end_date || "",
    time: item.time || "",
    venue: item.venue || "",
    audience: item.audience || "",
    facultyCoordinator: item.facultyCoordinator || item.faculty_coordinator || "",
    studentCoordinator: item.studentCoordinator || item.student_coordinator || "",
    bannerImage: item.bannerImage || item.banner_image || item.image_url || "",
    rulesLink: item.rulesLink || item.rules_link || item.file_url || "",
    description: item.description || "",
    prize: item.prize || ""
  }
}

function normalizeRegistration(item = {}) {
  return {
    id: item.id,
    competition_id: item.competition_id,
    student_name: item.student_name || "",
    register_number: item.register_number || item.regno || "",
    group_name: item.group_name || item.groupName || "",
    department: item.department || item.dept || "",
    semester: item.semester || item.year || "",
    email: item.email || "",
    contact_number: item.contact_number || item.contact || "",
    team_members: item.team_members || null,
    status: item.status || "Registered"
  }
}

function getDefaultOptionSettings() {
  return {
    clubs: [
      { value: "Coding Club", label: "Coding Club", order: 1 },
      { value: "Cultural Club", label: "Cultural Club", order: 2 },
      { value: "Sports Club", label: "Sports Club", order: 3 },
      { value: "Management Club", label: "Management Club", order: 4 }
    ],
    audiences: [
      { value: "1st BCA", label: "1st BCA", order: 1 },
      { value: "2nd BCA", label: "2nd BCA", order: 2 },
      { value: "3rd BCA", label: "3rd BCA", order: 3 },
      { value: "BCA", label: "BCA", order: 4 },
      { value: "1st BCOM", label: "1st BCOM", order: 5 },
      { value: "2nd BCOM", label: "2nd BCOM", order: 6 },
      { value: "3rd BCOM", label: "3rd BCOM", order: 7 },
      { value: "BCOM", label: "BCOM", order: 8 },
      { value: "CA", label: "CA", order: 9 },
      { value: "CS", label: "CS", order: 10 },
      { value: "All Students", label: "All Students", order: 11 }
    ],
    venues: [
      { value: "SVS Auditorium", label: "SVS Auditorium", order: 1 },
      { value: "APJ Abdul Kalam", label: "APJ Abdul Kalam", order: 2 },
      { value: "Aryabhata", label: "Aryabhata", order: 3 },
      { value: "Bill Gates(Lab)", label: "Bill Gates(Lab)", order: 4 },
      { value: "Dr B R Ambedkar", label: "Dr B R Ambedkar", order: 5 },
      { value: "Varahamihira", label: "Varahamihira", order: 6 },
      { value: "Bhagat Singh", label: "Bhagat Singh", order: 7 },
      { value: "Charaka", label: "Charaka", order: 8 },
      { value: "Open Ground", label: "Open Ground", order: 9 }
    ],
    categories: [
      { value: "Internal", label: "Internal", order: 1 },
      { value: "External", label: "External", order: 2 }
    ],
    competitionTypes: [
      { value: "Individual", label: "Individual", order: 1 },
      { value: "Group", label: "Group", order: 2 }
    ],
    eventDurations: [
      { value: "single", label: "Single day", order: 1 },
      { value: "multiple", label: "Multiple days", order: 2 }
    ],
    competitionDurations: [
      { value: "single", label: "Single day", order: 1 },
      { value: "multiple", label: "Multiple days", order: 2 }
    ],
    studentClasses: [
      { value: "1st BCA", label: "1st BCA", order: 1 },
      { value: "2nd BCA", label: "2nd BCA", order: 2 },
      { value: "3rd BCA", label: "3rd BCA", order: 3 },
      { value: "1st BCOM", label: "1st BCOM", order: 4 },
      { value: "2nd BCOM", label: "2nd BCOM", order: 5 },
      { value: "3rd BCOM", label: "3rd BCOM", order: 6 },
      { value: "CA", label: "CA", order: 7 },
      { value: "CS", label: "CS", order: 8 }
    ]
  }
}

const OPTION_GROUP_META = {
  audiences: { label: "Audiences", description: "Used in the event audience checklist." },
  venues: { label: "Venues", description: "Used in event and competition venue dropdowns." },
  categories: { label: "Categories", description: "Used in event and competition category dropdowns." },
  competitionTypes: { label: "Competition Types", description: "Used in the competition type dropdown." },
  eventDurations: { label: "Event Durations", description: "Used in the event duration dropdown." },
  competitionDurations: { label: "Competition Durations", description: "Used in the competition duration dropdown." },
  studentClasses: { label: "Student Classes", description: "Used in student coordinator class dropdowns." }
}

function normalizeOptionItem(item = {}, index = 0) {
  if (typeof item === "string") {
    return { value: item, label: item, order: index + 1 }
  }

  const value = String(item.value ?? item.label ?? "").trim()
  const label = String(item.label ?? item.value ?? "").trim()
  if (!value || !label) return null

  return {
    value,
    label,
    order: Number(item.order ?? item.display_order ?? index + 1) || index + 1
  }
}

function normalizeOptionSet(value, fallback = []) {
  let raw = value
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = []
    }
  }

  const items = Array.isArray(raw) ? raw : fallback
  return items
    .map((item, index) => normalizeOptionItem(item, index))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
}

async function fetchOptionSettingsWithFallback() {
  const defaults = getDefaultOptionSettings()

  try {
    const rows = await fetchTable("app_settings")
    const settings = {}

    Object.entries(defaults).forEach(([key, fallbackItems]) => {
      const row = rows.find((item) => (item.setting_key || item.key || item.name) === key)
      settings[key] = row
        ? normalizeOptionSet(row.setting_values ?? row.values ?? row.options ?? row.value, fallbackItems)
        : normalizeOptionSet(fallbackItems, fallbackItems)
    })

    return settings
  } catch {
    return defaults
  }
}

async function saveOptionSettingGroup(groupKey, items = []) {
  const payload = {
    setting_key: groupKey,
    setting_values: items.map((item, index) => ({
      value: item.value,
      label: item.label,
      order: Number(item.order || index + 1) || index + 1
    }))
  }

  const { error } = await supabaseClient.from("app_settings").upsert([payload], { onConflict: "setting_key" })
  if (error) throw error
}

function getOptionItems(settings = {}, key) {
  return normalizeOptionSet(settings[key], getDefaultOptionSettings()[key] || [])
}

function resequenceOptionItems(items = []) {
  return items
    .map((item, index) => normalizeOptionItem(item, index))
    .filter(Boolean)
    .map((item, index) => ({
      ...item,
      order: index + 1
    }))
}

function insertOptionItemAtOrder(items = [], nextItem, targetOrder = 0, editingIndex = -1) {
  const workingItems = [...items]

  if (editingIndex >= 0) {
    workingItems.splice(editingIndex, 1)
  }

  const normalizedNewItem = normalizeOptionItem(nextItem, 0)
  if (!normalizedNewItem) return resequenceOptionItems(workingItems)

  const insertAt = Math.max(0, Math.min((Number(targetOrder) || workingItems.length + 1) - 1, workingItems.length))
  workingItems.splice(insertAt, 0, normalizedNewItem)

  return resequenceOptionItems(workingItems)
}

function renderSelectOptions(items = [], placeholder = "", selectedValue = "") {
  const placeholderMarkup = placeholder ? `<option value="">${escapeHtml(placeholder)}</option>` : ""
  return `${placeholderMarkup}${items.map((item) => `
    <option value="${escapeHtml(item.value)}"${item.value === selectedValue ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}`
}

function renderCheckboxOptions(name, items = [], includeOther = false) {
  const normalizedItems = [...items]
  if (includeOther) normalizedItems.push({ value: "Other", label: "Other" })
  return normalizedItems.map((item) => `
    <label><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(item.value)}"> ${escapeHtml(item.label)}</label>`).join("")
}

function ensureSelectHasValue(select, value, label = "") {
  if (!select || !value) return
  const existing = [...select.options].some((option) => option.value === value)
  if (existing) return
  select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(value)}">${escapeHtml(label || value)}</option>`)
}

function renderClassOptions(items = getDefaultOptionSettings().studentClasses, selectedValue = "") {
  return `
    <option value="">Select class</option>
    ${items.map((item) => `<option value="${escapeHtml(item.value)}"${item.value === selectedValue ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
  `
}

function normalizeHighlight(item = {}) {
  const mediaUrl = item.media_url || item.mediaUrl || item.image_url || item.imageUrl || ""
  const storedType = item.media_type || item.mediaType || (item.category === "video" || item.category === "image" ? item.category : "")
  return {
    id: item.id,
    title: item.title || "Dashboard Highlight",
    subtitle: item.subtitle || item.description || "",
    image_url: mediaUrl,
    media_url: mediaUrl,
    media_type: storedType || inferMediaType(mediaUrl),
    cta_link: item.cta_link || item.ctaLink || "",
    display_order: Number(item.display_order || item.displayOrder || 0) || 0,
    category: item.category || storedType || "media"
  }
}

function normalizeContact(item = {}) {
  const contactType = item.contactType || item.contact_type || "support"
  const legacyDetail = item.detail || item.phone || item.timing || ""
  const legacyParts = legacyDetail.includes("|") ? legacyDetail.split("|").map((part) => part.trim()) : [legacyDetail.trim()]
  const isCoordinator = contactType === "coordinator"
  const inferredPhone = isCoordinator ? "" : (item.phone || (legacyParts.find((part) => /[+\d]{5,}/.test(part)) || ""))
  const nonPhoneParts = legacyParts.filter((part) => part && !/[+\d]{5,}/.test(part))
  const inferredTiming = isCoordinator ? "" : (item.timing || nonPhoneParts[0] || "")
  const inferredAddress = isCoordinator ? "" : (item.address || nonPhoneParts.slice(1).join(", "))
  let coordinatorMeta = {}

  if (isCoordinator) {
    try {
      coordinatorMeta = legacyDetail ? JSON.parse(legacyDetail) : {}
    } catch {
      coordinatorMeta = {}
    }
  }

  return {
    id: item.id,
    contactType,
    title: item.title || "",
    email: item.email || "",
    phone: inferredPhone,
    timing: inferredTiming,
    address: inferredAddress,
    detail: legacyDetail,
    clubName: item.clubName || item.club_name || "",
    facultyCoordinator: item.facultyCoordinator || item.faculty_coordinator || "",
    facultyCoordinatorEmail: coordinatorMeta.facultyCoordinatorEmail || "",
    facultyCoordinatorPhone: coordinatorMeta.facultyCoordinatorPhone || "",
    studentCoordinator: item.studentCoordinator || item.student_coordinator || "",
    studentCoordinatorClass: item.studentCoordinatorClass || item.student_coordinator_class || "",
    studentCoordinatorEmail: coordinatorMeta.studentCoordinatorEmail || "",
    studentCoordinatorPhone: coordinatorMeta.studentCoordinatorPhone || "",
    displayOrder: Number(item.displayOrder || item.display_order || 0) || 0
  }
}

function getDefaultContacts() {
  return [
    {
      id: "default-support-1",
      contactType: "support",
      title: "College Office",
      email: "college@trishaems.edu",
      phone: "+91 98765 43210",
      timing: "",
      address: "",
      displayOrder: 1
    },
    {
      id: "default-support-2",
      contactType: "support",
      title: "Event Desk",
      email: "events@trishaems.edu",
      phone: "+91 98450 23456",
      timing: "",
      address: "",
      displayOrder: 2
    },
    {
      id: "default-support-3",
      contactType: "support",
      title: "Technical Support",
      email: "support@trishaems.edu",
      phone: "",
      timing: "Mon-Sat, 9:00 AM to 5:00 PM",
      address: "",
      displayOrder: 3
    },
    {
      id: "default-coordinator-1",
      contactType: "coordinator",
      clubName: "Coding Club",
      facultyCoordinator: "Dr. Shrinivas",
      facultyCoordinatorEmail: "shrinivas@trishaems.edu",
      facultyCoordinatorPhone: "+91 98765 10001",
      studentCoordinator: "Swasthik C Shetty",
      studentCoordinatorClass: "3rd BCA",
      studentCoordinatorEmail: "swasthik@trishaems.edu",
      studentCoordinatorPhone: "+91 98765 20001",
      displayOrder: 1
    },
    {
      id: "default-coordinator-2",
      contactType: "coordinator",
      clubName: "Cultural Club",
      facultyCoordinator: "Prof. Divyashree",
      facultyCoordinatorEmail: "divyashree@trishaems.edu",
      facultyCoordinatorPhone: "+91 98765 10002",
      studentCoordinator: "Rashmitha",
      studentCoordinatorClass: "2nd BCOM",
      studentCoordinatorEmail: "rashmitha@trishaems.edu",
      studentCoordinatorPhone: "+91 98765 20002",
      displayOrder: 2
    },
    {
      id: "default-coordinator-3",
      contactType: "coordinator",
      clubName: "Sports Club",
      facultyCoordinator: "Mr. Dheeraj",
      facultyCoordinatorEmail: "dheeraj@trishaems.edu",
      facultyCoordinatorPhone: "+91 98765 10003",
      studentCoordinator: "Shriprada",
      studentCoordinatorClass: "1st BCA",
      studentCoordinatorEmail: "shriprada@trishaems.edu",
      studentCoordinatorPhone: "+91 98765 20003",
      displayOrder: 3
    },
    {
      id: "default-coordinator-4",
      contactType: "coordinator",
      clubName: "Management Club",
      facultyCoordinator: "Prof. Harini",
      facultyCoordinatorEmail: "harini@trishaems.edu",
      facultyCoordinatorPhone: "+91 98765 10004",
      studentCoordinator: "Pallavi",
      studentCoordinatorClass: "3rd BCOM",
      studentCoordinatorEmail: "pallavi@trishaems.edu",
      studentCoordinatorPhone: "+91 98765 20004",
      displayOrder: 4
    }
  ]
}

async function fetchContactsWithFallback() {
  try {
    const rows = await fetchTable("contacts")
    const contacts = rows.map(normalizeContact)
    return contacts.length ? contacts : getDefaultContacts()
  } catch {
    return getDefaultContacts()
  }
}

function getRegistrationParticipants(item = {}) {
  const participants = []
  const seen = new Set()

  function addParticipant(name, usn) {
    const normalizedUsn = String(usn || "").trim().toLowerCase()
    const normalizedName = String(name || "").trim().toLowerCase()
    const key = normalizedUsn || normalizedName
    if (!key || seen.has(key)) return
    seen.add(key)
    participants.push({
      name: safeText(name),
      usn: safeText(usn)
    })
  }

  addParticipant(item.student_name, item.register_number)
  ;(item.team_members || []).forEach((member) => addParticipant(member?.name, member?.usn))
  return participants
}

async function fetchTable(table) {
  const { data, error } = await supabaseClient.from(table).select("*")
  if (error) throw error
  return data || []
}

async function resolveLoginUserTable() {
  const preferredTables = ["users", "login_users"]
  for (const tableName of preferredTables) {
    const { error } = await supabaseClient.from(tableName).select("id", { head: true, count: "exact" })
    if (!error) return tableName
  }
  throw new Error('Login table not found. Create either "users" or "login_users" in Supabase.')
}

async function fetchLoginUsers() {
  const tableName = await resolveLoginUserTable()
  const { data, error } = await supabaseClient.from(tableName).select("*")
  if (error) throw error
  return (data || []).map(normalizeLoginUser)
}

async function fetchCoordinatorClubOptions(fallbackItems = []) {
  const fallback = normalizeOptionSet(fallbackItems, fallbackItems)
  try {
    const users = await fetchLoginUsers()
    const clubs = [...new Set(users
      .filter((item) => item.role === "coordinator")
      .map((item) => String(item.club || "").trim())
      .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b))

    if (!clubs.length) return fallback

    return clubs.map((club, index) => ({
      value: club,
      label: club,
      order: index + 1
    }))
  } catch {
    return fallback
  }
}

async function runLoginUserQuery(mode, payload = null, matchField = "id", matchValue = "") {
  const tableName = await resolveLoginUserTable()
  const runWrite = async (nextPayload) => {
    if (mode === "update") {
      return await supabaseClient.from(tableName).update(nextPayload).eq(matchField, matchValue)
    }
    return await supabaseClient.from(tableName).insert([nextPayload])
  }
  const getMissingColumn = (error) => {
    const message = error?.message || ""
    const quotedColumn = /'([^']+)'\s+column/i.exec(message)?.[1]
    if (quotedColumn) return quotedColumn
    if (/column.*active|active.*column/i.test(message)) return "active"
    if (/column.*display_name|display_name.*column/i.test(message)) return "display_name"
    return ""
  }
  const runWriteWithSchemaFallback = async () => {
    const optionalColumns = new Set(["active", "display_name"])
    const fallbackPayload = { ...payload }

    for (let attempt = 0; attempt <= optionalColumns.size; attempt += 1) {
      const { error } = await runWrite(fallbackPayload)
      if (!error) return

      const missingColumn = getMissingColumn(error)
      if (!optionalColumns.has(missingColumn) || !(missingColumn in fallbackPayload)) {
        throw error
      }

      delete fallbackPayload[missingColumn]
    }
  }

  if (mode === "delete") {
    const { error } = await supabaseClient.from(tableName).delete().eq(matchField, matchValue)
    if (error) throw error
    return
  }

  if (mode === "update" || mode === "insert") {
    await runWriteWithSchemaFallback()
  }
}

function normalizeLoginUser(item = {}) {
  return {
    id: item.id,
    role: String(item.role || "").trim().toLowerCase(),
    club: item.club || item.club_name || "",
    username: item.username || "",
    password: item.password || "",
    displayName: item.display_name || item.displayName || item.username || "",
    active: item.active !== false
  }
}

async function uploadFile(file, folder) {
  if (!file) return ""
  const extension = file.name.split(".").pop()
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
  const { error } = await supabaseClient.storage.from(EMS_CONFIG.storageBucket).upload(filePath, file, { upsert: false })
  if (error) throw new Error(`File upload failed. Create a public bucket named "${EMS_CONFIG.storageBucket}" in Supabase storage.`)
  const { data } = supabaseClient.storage.from(EMS_CONFIG.storageBucket).getPublicUrl(filePath)
  return data.publicUrl
}

function renderEmpty(message) { return `<div class="empty-state">${message}</div>` }

function buildReportMarkup({
  title,
  subtitle = "College Event Management System",
  brandTitle = "Trisha EMS",
  fileName = "report.pdf",
  orientation = "portrait",
  tableClassName = "",
  summary = [],
  filters = [],
  tableHeaders = [],
  tableRows = [],
  competitionMeta = [],
  reportSections = [],
  footerNotes = []
} = {}) {
  const tableStyle = "width:100%; border-collapse:collapse; table-layout:fixed; font-size:12px; border:1px solid #dfe6f2;"
  const compactTableStyle = "width:100%; border-collapse:collapse; table-layout:fixed; font-size:9px; border:1px solid #dfe6f2;"
  const headerCellStyle = "background:#f26a21; color:#ffffff; text-align:left; padding:8px 10px; border:1px solid #dfe6f2; font-weight:700;"
  const compactHeaderCellStyle = "background:#f26a21; color:#ffffff; text-align:left; padding:5px 6px; border:1px solid #dfe6f2; font-weight:700; line-height:1.2; white-space:normal;"
  const bodyCellStyle = "border:1px solid #dfe6f2; padding:8px 10px; vertical-align:top; overflow-wrap:anywhere; word-break:break-word;"
  const compactBodyCellStyle = "border:1px solid #dfe6f2; padding:5px 6px; vertical-align:top; overflow-wrap:anywhere; word-break:break-word; line-height:1.2;"
  const isCompactTable = (className = "") => String(className).split(/\s+/).includes("report-table-compact")
  const renderReportTable = (headers = [], rows = [], className = "") => {
    const compact = isCompactTable(className)
    const resolvedTableStyle = compact ? compactTableStyle : tableStyle
    const resolvedHeaderCellStyle = compact ? compactHeaderCellStyle : headerCellStyle
    const resolvedBodyCellStyle = compact ? compactBodyCellStyle : bodyCellStyle
    const emptyColspan = Math.max(headers.length, 1)

    return `<table class="report-table ${escapeHtml(className).trim()}" border="1" cellspacing="0" cellpadding="0" style="${resolvedTableStyle}">
            <thead>
              <tr>${headers.map((header) => `<th style="${resolvedHeaderCellStyle}">${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.length
                ? rows.map((row) => `<tr>${row.map((cell) => `<td style="${resolvedBodyCellStyle}">${cell}</td>`).join("")}</tr>`).join("")
                : `<tr><td colspan="${emptyColspan}" style="${resolvedBodyCellStyle}">No records available for the selected filters.</td></tr>`}
            </tbody>
          </table>`
  }

  const logoUrl = new URL("assets/college-logo.png", window.location.href).href
  const generatedOn = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })
  const summaryMarkup = summary.length
    ? `<div class="report-grid">${summary.map(({ label, value }) => `
        <div class="report-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>`).join("")}
      </div>`
    : ""
  const filterMarkup = filters.length
    ? `<div class="report-section">
        <h3>Applied Filters</h3>
        <div class="report-key-grid">${filters.map(({ label, value }) => `
          <div class="report-key-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>`).join("")}
        </div>
      </div>`
    : ""
  const competitionMetaMarkup = competitionMeta.length
    ? (() => {
        const rows = []
        for (let index = 0; index < competitionMeta.length; index += 2) {
          rows.push(competitionMeta.slice(index, index + 2))
        }
        return `<div class="report-section">
        <h3>Competition Details</h3>
        <table class="report-meta-table">
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${row.map(({ label, value }) => `
                  <td>
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </td>`).join("")}
                ${row.length === 1 ? `<td></td>` : ""}
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`
      })()
    : ""
  const sectionsMarkup = reportSections.length
    ? reportSections.map((section) => `
        <div class="report-section">
          <h3>${escapeHtml(section.title || "Report Data")}</h3>
          ${renderReportTable(section.headers || [], section.rows || [], section.tableClassName || tableClassName).replace("No records available for the selected filters.", "No records available for this section.")}
        </div>`).join("")
    : ""
  const footerMarkup = footerNotes.length
    ? `<div class="report-footer">
        ${footerNotes.map((note) => `
          <div class="report-footer-card">
            <span>${escapeHtml(note.label)}</span>
            <strong>${escapeHtml(note.value)}</strong>
          </div>`).join("")}
      </div>`
    : ""

  return {
    fileName,
    orientation,
    html: `
      <div class="report-sheet">
        <div class="report-header">
          <div class="report-brand">
            <img src="${logoUrl}" alt="Trisha EMS logo">
            <div>
              <h1>${escapeHtml(brandTitle)}</h1>
              <h2>${escapeHtml(title)}</h2>
              <span>${escapeHtml(subtitle)}</span>
            </div>
          </div>
          <div class="report-meta">
            <strong>Generated On</strong>
            <span>${escapeHtml(generatedOn)}</span>
          </div>
        </div>
        ${summaryMarkup}
        ${competitionMetaMarkup}
        ${filterMarkup}
        ${sectionsMarkup || `<div class="report-section">
          <h3>Report Data</h3>
          ${renderReportTable(tableHeaders, tableRows, tableClassName)}
        </div>`}
        ${footerMarkup}
      </div>`
  }
}

function downloadReportDoc(config) {
  const report = buildReportMarkup(config)
  const docHtml = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(report.fileName)}</title>
      <style>
        @page { size: ${report.orientation === "landscape" ? "A4 landscape" : "A4 portrait"}; margin: 0.5in; }
        body {
          font-family: Arial, sans-serif;
          color: #17233c;
          background: #ffffff;
          margin: 0;
        }
        .report-sheet {
          padding: 20px;
        }
        .report-header {
          width: 100%;
          border-bottom: 2px solid #f1d8cb;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .report-brand {
          width: 70%;
          display: inline-block;
          vertical-align: top;
        }
        .report-brand img {
          width: 82px;
          height: auto;
          vertical-align: middle;
          margin-right: 14px;
        }
        .report-brand div {
          display: inline-block;
          vertical-align: middle;
        }
        .report-brand span,
        .report-meta span,
        .report-key-item span,
        .report-card span,
        .report-footer-card span {
          margin: 0;
          color: #5f7091;
          font-size: 12px;
        }
        .report-brand h1 {
          margin: 0 0 4px;
          font-size: 26px;
          line-height: 1.2;
          color: #14284b;
        }
        .report-brand h2 {
          margin: 0 0 6px;
          font-size: 18px;
          line-height: 1.2;
          color: #f26a21;
        }
        .report-meta {
          width: 28%;
          display: inline-block;
          text-align: right;
          vertical-align: top;
        }
        .report-meta strong,
        .report-key-item strong,
        .report-card strong,
        .report-footer-card strong {
          display: block;
          margin-top: 6px;
          font-size: 14px;
          color: #17233c;
        }
        .report-grid,
        .report-key-grid,
        .report-footer {
          width: 100%;
          border-collapse: separate;
          border-spacing: 12px;
          margin-left: -12px;
        }
        .report-card,
        .report-key-item,
        .report-footer-card {
          display: inline-block;
          width: 28%;
          min-height: 60px;
          border: 1px solid #e7edf7;
          border-radius: 10px;
          background: #f8fbff;
          padding: 12px 14px;
          margin: 0 12px 12px 0;
          vertical-align: top;
          box-sizing: border-box;
        }
        .report-meta-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .report-meta-table td {
          width: 50%;
          border: 1px solid #dfe6f2;
          background: #f8fbff;
          padding: 12px 14px;
          vertical-align: top;
        }
        .report-meta-table span {
          display: inline-block;
          margin-right: 6px;
          color: #5f7091;
          font-size: 12px;
        }
        .report-meta-table strong {
          font-size: 14px;
          color: #17233c;
        }
        .report-section {
          margin-top: 18px;
        }
        .report-section h3 {
          margin: 0 0 12px;
          font-size: 16px;
          color: #14284b;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          table-layout: fixed;
        }
        .report-table th {
          background: #f26a21;
          color: #ffffff;
          text-align: left;
          padding: 8px 10px;
          border: 1px solid #dfe6f2;
        }
        .report-table td {
          border: 1px solid #dfe6f2;
          padding: 8px 10px;
          vertical-align: top;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .report-table.report-table-compact {
          font-size: 9px;
        }
        .report-table.report-table-compact th,
        .report-table.report-table-compact td {
          padding: 5px 6px;
          line-height: 1.2;
        }
        .report-table.report-table-compact th {
          white-space: normal;
        }
        .report-stack {
          display: block;
          line-height: 1.45;
        }
      </style>
    </head>
    <body>${report.html}</body>
  </html>`
  const blob = new Blob(["\ufeff", docHtml], { type: "application/msword" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = report.fileName.replace(/\.pdf$/i, ".doc")
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function downloadHtmlDoc(fileName, html, orientation = "portrait") {
  const docHtml = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(fileName)}</title>
      <style>
        @page { size: ${orientation === "landscape" ? "A4 landscape" : "A4 portrait"}; margin: 0.6in; }
        body { margin: 0; background: #ffffff; }
      </style>
    </head>
    <body>${html}</body>
  </html>`
  const blob = new Blob(["\ufeff", docHtml], { type: "application/msword" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName.replace(/\.pdf$/i, ".doc")
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function buildSummaryReportMarkup({ type, item, participantCount = 0 } = {}) {
  const logoUrl = new URL("assets/college-logo.png", window.location.href).href
  const isEvent = type === "event"
  const title = isEvent ? item.theme : item.theme
  const dateValue = isEvent ? item.date : item.competitionDate
  const endDateValue = isEvent ? item.endDate : item.competitionEndDate
  const timeValue = isEvent ? item.time : item.time
  const venueValue = item.venue || "-"
  const departmentLine = item.club ? `${safeText(item.club)} Department / Club` : "Department / Club Activity"
  const coordinatorLine = isEvent
    ? safeText(item.resourcePerson, "Organising Team")
    : safeText(item.facultyCoordinator, "Organising Team")
  const audienceLine = isEvent
    ? safeText(item.audience, "Participating students")
    : item.competition_type === "Group"
      ? `Team participation (${item.minTeamLimit || 2} to ${item.maxTeamLimit || item.teamLimit || 2} members)`
      : "Individual participation"
  const paragraphOne = isEvent
    ? `${escapeHtml(title)} was conducted for the benefit of ${escapeHtml(safeText(item.audience, "students"))}. The programme was organised to create an engaging academic and co-curricular learning experience for participants.`
    : `${escapeHtml(title)} was organised as a ${escapeHtml((item.competition_type || "competition").toLowerCase())} activity to encourage student participation, discipline, collaboration and practical exposure through a structured competition format.`
  const paragraphTwo = isEvent
    ? `The activity was held on ${escapeHtml(formatDateRange(dateValue, endDateValue))} at ${escapeHtml(safeText(venueValue))}${timeValue ? ` from ${escapeHtml(formatTime(timeValue))}` : ""}. The session was coordinated by ${escapeHtml(coordinatorLine)} and designed to strengthen involvement, confidence and applied learning among students.`
    : `The competition was scheduled on ${escapeHtml(formatDateRange(dateValue, endDateValue))} at ${escapeHtml(safeText(venueValue))}${timeValue ? ` from ${escapeHtml(formatTime(timeValue))}` : ""}. Faculty coordination was led by ${escapeHtml(coordinatorLine)}, and the activity was conducted with a focus on fair participation and quality presentation.`
  const paragraphThree = isEvent
    ? `The programme concluded successfully with active student participation and contributed to the department's activity record for the academic period.`
    : `The competition concluded with ${escapeHtml(participantCount)} registration${participantCount === 1 ? "" : "s"} and helped provide a strong platform for students to present their skills and team spirit in a formal setting.`

  return `
    <div class="summary-sheet" style="font-family: 'Times New Roman', serif; color: #1c1c1c; background: #ffffff; box-sizing: border-box; width: 100%; max-width: 483pt; min-height: 690pt; margin: 0 auto; padding: 18pt 24pt; line-height: 1.45;">
      <table style="width: 100%; min-height: 654pt; border-collapse: collapse; table-layout: fixed;">
        <tr>
          <td style="height: 544pt; vertical-align: top; padding: 0;">
        <div style="text-align: center; margin-bottom: 18px;">
          <img src="${logoUrl}" alt="Trisha logo" style="display: block; width: 82px; max-width: 82px; height: auto; margin: 0 auto 8px;">
          <div style="font-size: 20px; font-weight: 700; letter-spacing: 0.02em;">Trisha Vidya College of Commerce & Management</div>
          <div style="font-size: 12px;">S.V.S Campus, Mattu Road, Katapadi, Udupi - 574105</div>
          <div style="font-size: 18px; font-weight: 700; margin-top: 12px;">${escapeHtml(departmentLine)}</div>
          <div style="font-size: 15px; font-weight: 700; margin-top: 6px;">${isEvent ? "PROGRAMME SUMMARY REPORT" : "COMPETITION SUMMARY REPORT"}</div>
          <div style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin-top: 6px;">"${escapeHtml(title)}"</div>
        </div>

        <div style="text-align: center; font-size: 13px; font-weight: 700; margin: 10px 0 20px;">
          DATE: ${escapeHtml(formatDateRange(dateValue, endDateValue))} &nbsp;&nbsp; VENUE: ${escapeHtml(safeText(venueValue))} &nbsp;&nbsp; TIME: ${escapeHtml(formatTime(timeValue))}
        </div>

        <div style="font-size: 14px; text-align: justify; max-width: 88%; margin: 0 auto;">
          <p style="margin: 0 0 12px;">${paragraphOne}</p>
          <p style="margin: 0 0 12px;">${paragraphTwo}</p>
          <p style="margin: 0 0 16px;">${paragraphThree}</p>
        </div>

        <div style="font-size: 14px; max-width: 88%; margin: 14px auto 0;">
          <div><strong>Beneficiaries:</strong> ${escapeHtml(audienceLine)}</div>
          <div><strong>No. of Registrations:</strong> ${escapeHtml(participantCount || (isEvent ? "-" : "0"))}</div>
          <div><strong>Members Present:</strong> ${escapeHtml(coordinatorLine)}</div>
        </div>
          </td>
        </tr>
        <tr>
          <td style="height: 110pt; vertical-align: bottom; padding: 0;">
        <div class="summary-footer" style="font-size: 14px;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="width: 50%; vertical-align: bottom; padding-right: 20px;">
              <div style="width: 170px; text-align: center;">
                <div style="border-top: 1px solid #333; padding-top: 6px;">Coordinator</div>
              </div>
            </td>
            <td style="width: 50%; vertical-align: bottom; padding-left: 20px;">
              <div style="width: 170px; margin-left: auto; text-align: center;">
                <div style="border-top: 1px solid #333; padding-top: 6px;">Principal</div>
              </div>
            </td>
          </tr>
        </table>
        </div>
          </td>
        </tr>
      </table>
    </div>`
}

function renderMedia(url, alt = "Attachment") {
  if (!url) return renderEmpty("No attachment added yet.")
  const lower = url.toLowerCase()
  if (/\.(png|jpg|jpeg|webp|gif|svg)$/.test(lower)) return `<img src="${url}" alt="${alt}">`
  if (lower.endsWith(".pdf")) return `<iframe src="${url}" title="${alt}" style="height:420px;border:0;"></iframe>`
  return `<a class="btn-soft" href="${url}" target="_blank" rel="noreferrer">Open attachment</a>`
}

function heroSlides() {
  return ["assets/campus-hero.svg", "assets/event-scene.svg", "assets/competition-stage.svg"]
}

function studentHighlightSlides() {
  return [
    { type: "video", src: "assets/highlights/Tvccm-v.mp4", alt: "Campus highlight video 1" },
    { type: "video", src: "assets/highlights/Tvccm-v1.mp4", alt: "Campus highlight video 2" },
    { type: "video", src: "assets/highlights/Tvccm-v2.mp4", alt: "Campus highlight video 3" },
    { type: "video", src: "assets/highlights/Tvccm-v3.mp4", alt: "Campus highlight video 4" },
    { type: "video", src: "assets/highlights/Tvccm-v4.mp4", alt: "Campus highlight video 4" },
    { type: "video", src: "assets/highlights/WhatsApp Video 2026-04-11 at 12.02.42 PM.mp4", alt: "Campus highlight video 4" }
  ]
}

function inferMediaType(url = "") {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase()
  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(cleanUrl)) return "video"
  if (/\.(png|jpg|jpeg|webp|gif|svg|bmp|avif)$/i.test(cleanUrl)) return "image"
  return ""
}

function renderHighlightMedia(url, mediaType = "", alt = "Dashboard highlight", className = "") {
  const type = mediaType || inferMediaType(url)
  if (!url) return renderEmpty("No media added yet.")
  if (type === "video") return `<video ${className ? `class="${className}"` : ""} src="${url}" muted loop autoplay playsinline preload="metadata" aria-label="${escapeHtml(alt)}"></video>`
  return `<img ${className ? `class="${className}"` : ""} src="${url}" alt="${escapeHtml(alt)}">`
}

async function fetchHighlightSlides() {
  const rows = (await fetchTable("highlights").catch(() => [])).map(normalizeHighlight).sort((a, b) => a.display_order - b.display_order)
  const validRows = rows.filter((item) => {
    if (!item.media_url) return false
    const type = item.media_type || inferMediaType(item.media_url)
    return type === "video"
  })
  if (!validRows.length) return studentHighlightSlides()
  return validRows.map((item, index) => ({
    type: "video",
    src: item.media_url,
    alt: item.title || `Dashboard highlight ${index + 1}`
  }))
}

function appendSlideMedia(container, slides = []) {
  if (!container) return
  container.innerHTML = ""
  slides.forEach((slide, index) => {
    if (slide.type === "video") {
      const video = document.createElement("video")
      video.src = slide.src
      video.className = "slide-media"
      video.preload = "auto"
      video.muted = true
      video.loop = true
      video.autoplay = true
      video.playsInline = true
      video.setAttribute("muted", "")
      video.setAttribute("autoplay", "")
      video.setAttribute("loop", "")
      video.setAttribute("playsinline", "")
      video.setAttribute("aria-label", slide.alt || `Campus video ${index + 1}`)
      container.appendChild(video)
      return
    }

    const img = document.createElement("img")
    img.src = slide.src
    img.alt = slide.alt || `Campus preview ${index + 1}`
    img.className = "slide-media"
    container.appendChild(img)
  })
}

function startSlider(selector = ".slider .slide-media") {
  const slides = $$(selector)
  if (!slides.length) return
  slides.forEach((slide) => {
    if (slide.tagName === "VIDEO") {
      slide.muted = true
      slide.play().catch(() => {})
    }
  })
  let current = 0
  slides[current].classList.add("active")
  if (slides.length === 1) return
  window.setInterval(() => {
    slides[current].classList.remove("active")
    current = (current + 1) % slides.length
    slides[current].classList.add("active")
  }, 2600)
}

function setCards(values) {
  values.forEach(([id, value]) => {
    const node = document.getElementById(id)
    if (node) node.textContent = value
  })
}

async function initLoginPage() {
  const session = getSession()
  if (session?.role) return window.location.href = getDashboardHref(session)
  const form = document.getElementById("loginForm")
  const flash = document.getElementById("loginFlash")
  const roleField = $("#role")
  const usernameField = $("#username")
  const clubField = $("#clubSelectField")
  const clubSelect = $("#clubSelect")
  const passwordField = $("#password")
  const togglePassword = $("#togglePassword")
  const optionSettings = await fetchOptionSettingsWithFallback()
  const coordinatorClubOptions = await fetchCoordinatorClubOptions(getOptionItems(optionSettings, "clubs"))

  togglePassword?.addEventListener("click", () => {
    if (!passwordField) return
    const showPassword = passwordField.type === "password"
    passwordField.type = showPassword ? "text" : "password"
    togglePassword.setAttribute("aria-pressed", String(showPassword))
    togglePassword.setAttribute("aria-label", showPassword ? "Hide password" : "Show password")
  })

  if (clubSelect) {
    clubSelect.innerHTML = renderSelectOptions(coordinatorClubOptions, "Select club")
  }

  function syncRoleUI() {
    const isCoordinator = roleField?.value === "coordinator"
    clubField?.classList.toggle("hidden", !isCoordinator)
    if (clubSelect) clubSelect.required = isCoordinator
    if (!isCoordinator && clubSelect) clubSelect.value = ""
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    clearFlash(flash)
    const role = roleField?.value || ""
    const club = clubSelect?.value || ""
    const username = usernameField?.value.trim() || ""
    const password = passwordField?.value.trim() || ""
    if (!role || !username || !password) return showFlash(flash, "Select a role and enter username and password.", "error")
    if (role === "coordinator" && !club) return showFlash(flash, "Select the coordinator club before logging in.", "error")

    let accounts = []
    try {
      accounts = await fetchLoginUsers()
    } catch (error) {
      return showFlash(flash, error.message || "Unable to verify login credentials.", "error")
    }

    const account = accounts.find((item) => item.active
      && item.role === role
      && item.username === username
      && item.password === password
      && (role !== "coordinator" || item.club === club))

    if (!account) {
      return showFlash(flash, "Invalid login details for the selected role.", "error")
    }

    setSession({
      role: account.role,
      name: account.displayName || account.username,
      username: account.username,
      club: account.club || "",
      loginAt: new Date().toISOString()
    })
    window.location.href = getDashboardHref(account)
  })

  roleField?.addEventListener("change", () => {
    if (usernameField) usernameField.value = ""
    if (passwordField) passwordField.value = ""
    if (clubSelect) clubSelect.value = ""
    if (passwordField?.type === "text") {
      passwordField.type = "password"
      togglePassword?.setAttribute("aria-pressed", "false")
      togglePassword?.setAttribute("aria-label", "Show password")
    }
    clearFlash(flash)
    syncRoleUI()
  })
  syncRoleUI()
}

async function initStudentDashboard() {
  requireRole("student"); initNav()
  const hero = document.getElementById("heroSlider")
  appendSlideMedia(hero, await fetchHighlightSlides())
  startSlider("#heroSlider .slide-media")
  const [eventsData, competitionsData] = await Promise.all([
    fetchTable("events").catch(() => []),
    fetchTable("competitions").catch(() => [])
  ])
  const events = eventsData.map(normalizeEvent).sort((a, b) => (a.date || "").localeCompare(b.date || ""))
  const competitions = competitionsData.map(normalizeCompetition).sort((a, b) => (a.competitionDate || "").localeCompare(b.competitionDate || ""))
  const upcomingEvents = events.filter((item) => isVisiblePublishedItem(item.date, item.time, item.endDate))
  const upcomingCompetitions = competitions.filter((item) => isVisiblePublishedItem(item.competitionDate, item.time, item.competitionEndDate))
  const upcoming = [
    ...upcomingEvents.map((item) => ({ ...item, kind: "Event", when: item.date, until: item.endDate })),
    ...upcomingCompetitions.map((item) => ({ ...item, kind: "Competition", when: item.competitionDate, until: item.competitionEndDate }))
  ].sort((a, b) => (a.when || "").localeCompare(b.when || "")).slice(0, 6)
  document.getElementById("welcomeName").textContent = getSession()?.name || "Student"
  setCards([["studentEventCount", upcomingEvents.length], ["studentCompetitionCount", upcomingCompetitions.length]])
  document.getElementById("studentUpcoming").innerHTML = upcoming.length ? upcoming.map((item) => `
    <article class="content-card">
      <span class="pill">${item.kind}</span>
      <img class="cover" src="${getStudentScheduleImage(item)}" alt="${item.theme}">
      <div class="title-row">
        <h3>${item.theme}</h3>
        <span class="status-chip ${statusFromDateRange(item.when, item.until).toLowerCase()}">${statusFromDateRange(item.when, item.until)}</span>
      </div>
      <p class="muted">${safeText(item.description, `${safeText(item.club, "Campus activity")} is lined up for students and teams.`)}</p>
      <div class="mini-grid">
        <div><strong>Date</strong><br>${formatDateRange(item.when, item.until)}</div>
        <div><strong>Venue</strong><br>${safeText(item.venue)}</div>
        <div><strong>Timeline</strong><br>${deadlineLabelRange(item.when, item.until)}</div>
      </div>
      <a class="btn" href="${item.kind === "Event" ? `event-details.html?id=${item.id}` : `competition-details.html?id=${item.id}`}">View details</a>
    </article>`).join("") : renderEmpty("No upcoming items available right now.")
}

function getStudentScheduleImage(item) {
  const eventFallback = "assets/event-scene.svg"
  const competitionFallback = "assets/competition-stage.svg"
  const candidate = item.bannerImage || ""
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(candidate || "") ? candidate : (item.kind === "Event" ? eventFallback : competitionFallback)
}

async function initEventsPage() {
  requireRole("student"); initNav()
  const [eventsData, competitionsData] = await Promise.all([fetchTable("events").catch(() => []), fetchTable("competitions").catch(() => [])])
  const items = [
    ...eventsData
      .map((item) => normalizeEvent(item))
      .filter((item) => isVisiblePublishedItem(item.date, item.time, item.endDate))
      .map((item) => ({ ...item, kind: "Event", when: item.date, until: item.endDate })),
    ...competitionsData
      .map((item) => normalizeCompetition(item))
      .filter((item) => isVisiblePublishedItem(item.competitionDate, item.time, item.competitionEndDate))
      .map((item) => ({ ...item, kind: "Competition", when: item.competitionDate, until: item.competitionEndDate }))
  ].sort((a, b) => (a.when || "").localeCompare(b.when || ""))
  const search = document.getElementById("catalogSearch")
  const filterButtons = $$(".filter-btn")
  const container = document.getElementById("catalogCards")
  let selected = "All"
  function render() {
    const query = search.value.trim().toLowerCase()
    const filtered = items.filter((item) => {
      const matchesKind = selected === "All" || item.kind === selected
      const sourceText = `${item.theme} ${item.club || ""} ${item.venue || ""} ${item.description || ""}`.toLowerCase()
      return matchesKind && sourceText.includes(query)
    })
    container.innerHTML = filtered.length ? filtered.map((item) => `
      <article class="content-card">
        <div class="title-row">
          <div><span class="pill">${item.kind}</span><h3>${item.theme}</h3></div>
          <span class="status-chip ${statusFromDateRange(item.when, item.until).toLowerCase()}">${deadlineLabelRange(item.when, item.until)}</span>
        </div>
        <p class="muted">${safeText(item.description, item.kind === "Event" ? "Academic and club-led activity for students." : "Competition registration and coordination space.")}</p>
        <div class="mini-grid">
          <div><strong>Date</strong><br>${formatDateRange(item.when, item.until)}</div>
          <div><strong>Time</strong><br>${formatTime(item.time)}</div>
          <div><strong>Venue</strong><br>${safeText(item.venue)}</div>
        </div>
        <div class="button-row">
          <a class="btn" href="${item.kind === "Event" ? `event-details.html?id=${item.id}` : `competition-details.html?id=${item.id}`}">Open</a>
          ${item.kind === "Competition" ? `<a class="btn-ghost" href="registration.html?id=${item.id}">Register</a>` : ""}
        </div>
      </article>`).join("") : renderEmpty("No items match your filters right now.")
  }
  filterButtons.forEach((button) => button.addEventListener("click", () => {
    selected = button.dataset.filter
    filterButtons.forEach((node) => node.classList.remove("active"))
    button.classList.add("active")
    render()
  }))
  search.addEventListener("input", render)
  render()
}

async function initEventDetails() {
  requireRole("student"); initNav()
  const id = new URLSearchParams(window.location.search).get("id")
  const flash = document.getElementById("detailFlash")
  if (!id) return showFlash(flash, "Event ID is missing.", "error")
  const { data, error } = await supabaseClient.from("events").select("*").eq("id", id).single()
  if (error || !data) return showFlash(flash, "Unable to load event details.", "error")
  const item = normalizeEvent(data)
  $("#detailTitle").textContent = item.theme
  $("#detailSummary").textContent = safeText(item.description, "This event is open for campus participation with guided coordination and clear scheduling.")
  $("#detailMeta").innerHTML = `
    <div><strong>Category</strong><br>${safeText(item.category)}</div>
    <div><strong>Date</strong><br>${formatDateRange(item.date, item.endDate)}</div>
    <div><strong>Time</strong><br>${formatTime(item.time)}</div>
    <div><strong>Venue</strong><br>${safeText(item.venue)}</div>
    <div><strong>Club</strong><br>${safeText(item.club)}</div>
    <div><strong>Audience</strong><br>${safeText(item.audience)}</div>`
  $("#detailExtra").innerHTML = `<div class="detail-list"><div><strong>Resource Person</strong><br>${safeText(item.resourcePerson)}</div><div><strong>Status</strong><br>${statusFromDateRange(item.date, item.endDate)}</div><div><strong>Registration Window</strong><br>${deadlineLabelRange(item.date, item.endDate)}</div></div>`
  $("#detailMedia").innerHTML = renderMedia(item.brochureLink || item.bannerImage || "assets/event-scene.svg", `${item.theme} brochure`)
}

async function initCompetitionDetails() {
  requireRole("student"); initNav()
  const id = new URLSearchParams(window.location.search).get("id")
  const flash = document.getElementById("detailFlash")
  if (!id) return showFlash(flash, "Competition ID is missing.", "error")
  const { data, error } = await supabaseClient.from("competitions").select("*").eq("id", id).single()
  if (error || !data) return showFlash(flash, "Unable to load competition details.", "error")
  const item = normalizeCompetition(data)
  $("#detailTitle").textContent = item.theme
  $("#detailSummary").textContent = safeText(item.description, "Competition entries are being coordinated through Supabase-backed registration and admin review.")
  $("#detailMeta").innerHTML = `
    <div><strong>Type</strong><br>${safeText(item.competition_type)}</div>
    <div><strong>Date</strong><br>${formatDateRange(item.competitionDate, item.competitionEndDate)}</div>
    <div><strong>Time</strong><br>${formatTime(item.time)}</div>
    <div><strong>Venue</strong><br>${safeText(item.venue)}</div>
    <div><strong>Club</strong><br>${safeText(item.club)}</div>
    <div><strong>Audience</strong><br>${safeText(item.audience)}</div>
    <div><strong>Team Size</strong><br>${item.competition_type === "Group" ? `${item.minTeamLimit || 2} to ${item.maxTeamLimit || item.teamLimit || 2}` : "1"}</div>`
  $("#detailExtra").innerHTML = `<div class="detail-list"><div><strong>Faculty Coordinator</strong><br>${safeText(item.facultyCoordinator)}</div><div><strong>Student Coordinator</strong><br>${safeText(item.studentCoordinator)}</div><div><strong>Prize Focus</strong><br>${safeText(item.prize, "Certificates and campus recognition")}</div><div><strong>Status</strong><br>${statusFromDateRange(item.competitionDate, item.competitionEndDate)}</div></div>`
  $("#detailMedia").innerHTML = renderMedia(item.rulesLink || "assets/competition-stage.svg", `${item.theme} rules`)
  $("#registerBtn").href = `registration.html?id=${item.id}`
}

async function initRegistrationPage() {
  requireRole("student"); initNav()
  const id = new URLSearchParams(window.location.search).get("id")
  const flash = document.getElementById("registrationFlash")
  const form = document.getElementById("registrationForm")
  const groupFields = document.getElementById("groupFields")
  const groupNameField = document.getElementById("groupNameField")
  const groupNameInput = document.getElementById("groupName")
  if (!id) return showFlash(flash, "Competition ID is required to register.", "error")
  const { data, error } = await supabaseClient.from("competitions").select("*").eq("id", id).single()
  if (error || !data) return showFlash(flash, "Competition details could not be loaded.", "error")
  const currentCompetition = normalizeCompetition(data)
  const minMembers = currentCompetition.minTeamLimit || (currentCompetition.competition_type === "Group" ? 2 : 1)
  const maxMembers = currentCompetition.maxTeamLimit || currentCompetition.teamLimit || (currentCompetition.competition_type === "Group" ? minMembers : 1)
  const isGroupCompetition = currentCompetition.competition_type === "Group"
  $("#registrationCompetition").innerHTML = `<div class="mini-grid"><div><strong>Competition</strong><br>${currentCompetition.theme}</div><div><strong>Type</strong><br>${currentCompetition.competition_type}</div><div><strong>Date</strong><br>${formatDateRange(currentCompetition.competitionDate, currentCompetition.competitionEndDate)}</div></div>`
  $("#registrationRuleNote").textContent = isGroupCompetition
    ? `Team registration is allowed only between ${minMembers} and ${maxMembers} members, including the team leader.`
    : "This is an individual competition. Only one participant can register."
  groupNameField?.classList.toggle("hidden", !isGroupCompetition)
  if (!isGroupCompetition && groupNameInput) groupNameInput.value = ""
  function renderGroupFields() {
    groupFields.innerHTML = ""
    if (!isGroupCompetition || maxMembers <= 1) return
    for (let index = 2; index <= maxMembers; index += 1) {
      groupFields.innerHTML += `<div class="team-member-row"><div class="field"><label>Team member ${index} name</label><input type="text" id="member-name-${index}" placeholder="Enter member ${index} name"></div><div class="field"><label>Team member ${index} register number</label><input type="text" id="member-usn-${index}" placeholder="Enter member ${index} register number"></div><div class="field"><label>Team member ${index} class</label><select id="member-class-${index}">${renderClassOptions()}</select></div></div>`
    }
  }
  renderGroupFields()
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); clearFlash(flash)
    const registerNumber = $("#regno").value.trim()
    const contactNumber = $("#contact").value.trim()
    if (!isTenDigitPhone(contactNumber)) {
      return showFlash(flash, "Contact number must be exactly 10 digits.", "error")
    }
    const { data: existing, error: checkError } = await supabaseClient.from("registrations").select("id").eq("competition_id", id).eq("register_number", registerNumber)
    if (checkError) return showFlash(flash, "Unable to verify duplicate registration right now.", "error")
    if (existing?.length) return showFlash(flash, "This register number is already registered for the selected competition.", "error")
    const teamMembers = isGroupCompetition
      ? Array.from({ length: Math.max(maxMembers - 1, 0) }, (_, offset) => {
          const index = offset + 2
          return {
            name: $(`#member-name-${index}`)?.value.trim(),
            usn: $(`#member-usn-${index}`)?.value.trim(),
            class: $(`#member-class-${index}`)?.value || ""
          }
        }).filter((member) => member.name && member.usn && member.class)
      : null

    if (isGroupCompetition) {
      const fullTeam = [{ name: $("#name").value.trim(), usn: registerNumber, class: $("#sem").value }, ...(teamMembers || [])]
      if (fullTeam.length < minMembers || fullTeam.length > maxMembers) {
        return showFlash(flash, `Group registration must contain between ${minMembers} and ${maxMembers} members.`, "error")
      }
    }

    const payload = {
      competition_id: id,
      student_name: $("#name").value.trim(),
      register_number: registerNumber,
      group_name: isGroupCompetition ? groupNameInput?.value.trim() || null : null,
      department: $("#dept").value,
      semester: $("#sem").value,
      email: $("#email").value.trim(),
      contact_number: contactNumber,
      team_members: teamMembers?.length ? [{ name: $("#name").value.trim(), usn: registerNumber, class: $("#sem").value }, ...teamMembers] : null
    }
    let { error: insertError } = await supabaseClient.from("registrations").insert([payload])
    if (insertError && /group_name/i.test(insertError.message || "")) {
      const fallbackPayload = { ...payload }
      delete fallbackPayload.group_name
      ;({ error: insertError } = await supabaseClient.from("registrations").insert([fallbackPayload]))
    }
    if (insertError) {
      return showFlash(flash, `Registration could not be saved: ${insertError.message}`, "error")
    }
    form.reset(); renderGroupFields(); showFlash(flash, "Registration submitted successfully.", "success")
  })
}

async function initContactPage() {
  requireRole("student")
  initNav()

  const supportContainer = $("#supportContacts")
  const coordinatorBody = $("#coordinatorContacts")
  const contacts = (await fetchContactsWithFallback())
    .sort((a, b) => a.displayOrder - b.displayOrder || (a.title || a.clubName).localeCompare(b.title || b.clubName))

  const supportContacts = contacts.filter((item) => item.contactType === "support")
  const coordinatorContacts = contacts.filter((item) => item.contactType === "coordinator")

  if (supportContainer) {
    supportContainer.innerHTML = supportContacts.length
      ? supportContacts.map((item) => `
          <article class="contact-card">
            <h3>${escapeHtml(safeText(item.title))}</h3>
            ${item.email ? `<p class="muted">${escapeHtml(item.email)}</p>` : ""}
            ${renderUniqueContactLines([item.phone, item.timing, item.address])}
          </article>`).join("")
      : renderEmpty("No support contacts available right now.")
  }

  if (coordinatorBody) {
    coordinatorBody.innerHTML = coordinatorContacts.length
      ? coordinatorContacts.map((item) => `
          <tr>
            <td>${escapeHtml(safeText(item.clubName))}</td>
            <td>${formatMultilineHtml(item.facultyCoordinator)}</td>
            <td>${formatMultilineHtml(buildStudentCoordinatorDisplay(item.studentCoordinator, item.studentCoordinatorClass))}</td>
          </tr>`).join("")
      : `<tr><td colspan="3">No club coordinators available right now.</td></tr>`
  }
}

async function initAdminDashboard() {
  requireAnyRole("admin", "coordinator"); initNav()
  const session = getSession()
  const coordinatorClub = getSessionClub(session)
  const [eventsData, competitionsData] = await Promise.all([
    fetchTable("events").catch(() => []), fetchTable("competitions").catch(() => [])
  ])
  const events = eventsData.map(normalizeEvent)
  const competitions = competitionsData.map(normalizeCompetition)
  const metricEvents = isCoordinatorSession(session)
    ? events.filter((item) => itemBelongsToClub(item.club, coordinatorClub))
    : events
  const metricCompetitions = isCoordinatorSession(session)
    ? competitions.filter((item) => itemBelongsToClub(item.club, coordinatorClub))
    : competitions
  const upcomingEvents = events.filter((item) => isVisiblePublishedItem(item.date, item.time, item.endDate))
  const upcomingCompetitions = competitions.filter((item) => isVisiblePublishedItem(item.competitionDate, item.time, item.competitionEndDate))

  const dashboardTitle = $(".page-heading h1")
  const dashboardCopy = $(".page-heading p")
  const brandText = $(".brand-copy span")
  if (isCoordinatorSession(session)) {
    if (dashboardTitle) dashboardTitle.textContent = `${safeText(coordinatorClub, "Coordinator")} dashboard`
    if (dashboardCopy) dashboardCopy.textContent = "Track upcoming events and competitions across all clubs from one focused workspace."
    if (brandText) brandText.textContent = "Coordinator workspace"
  }

  setCards([
    ["totalEvents", metricEvents.length],
    ["totalCompetitions", metricCompetitions.length],
    ["totalUpcomingEvents", upcomingEvents.length],
    ["totalUpcomingCompetitions", upcomingCompetitions.length]
  ])
  const eventsBody = $("#dashboardEvents")
  const competitionsBody = $("#dashboardCompetitions")
  const eventDateFilter = $("#eventDateFilter")
  const competitionDateFilter = $("#competitionDateFilter")

  function isUpcoming(value, endValue = "") {
    const diff = daysUntil(endValue || value)
    return diff !== null && diff >= 0
  }

  function renderEvents() {
    const selectedDate = eventDateFilter?.value || ""
    const upcomingEvents = events
      .filter((item) => isUpcoming(item.date, item.endDate))
      .filter((item) => dateMatchesRange(selectedDate, item.date, item.endDate))
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .slice(0, 6)

    eventsBody.innerHTML = upcomingEvents.length
      ? upcomingEvents.map((item) => `<tr><td>${item.theme}</td><td>${formatDateRange(item.date, item.endDate)}</td><td>${safeText(item.venue)}</td><td>${safeText(item.club)}</td></tr>`).join("")
      : `<tr><td colspan="4">${selectedDate ? "No upcoming events found for the selected date." : "No upcoming events available."}</td></tr>`
  }

  function renderCompetitions() {
    const selectedDate = competitionDateFilter?.value || ""
    const upcomingCompetitions = competitions
      .filter((item) => isUpcoming(item.competitionDate, item.competitionEndDate))
      .filter((item) => dateMatchesRange(selectedDate, item.competitionDate, item.competitionEndDate))
      .sort((a, b) => (a.competitionDate || "").localeCompare(b.competitionDate || ""))
      .slice(0, 6)

    competitionsBody.innerHTML = upcomingCompetitions.length
      ? upcomingCompetitions.map((item) => `<tr><td>${item.theme}</td><td>${item.competition_type}</td><td>${formatDateRange(item.competitionDate, item.competitionEndDate)}</td><td>${safeText(item.venue)}</td><td>${safeText(item.club)}</td></tr>`).join("")
      : `<tr><td colspan="5">${selectedDate ? "No upcoming competitions found for the selected date." : "No upcoming competitions available."}</td></tr>`
  }

  eventDateFilter?.addEventListener("change", renderEvents)
  competitionDateFilter?.addEventListener("change", renderCompetitions)

  renderEvents()
  renderCompetitions()
}

async function initManageOptions() {
  requireRole("admin")
  initNav()

  const form = $("#optionForm")
  const flash = $("#optionFlash")
  const list = $("#optionGroupList")
  const groupField = $("#optionGroup")
  const labelField = $("#optionLabel")
  const valueField = $("#optionValue")
  const orderField = $("#optionOrder")
  const helper = $("#optionGroupHelper")
  let settings = await fetchOptionSettingsWithFallback()
  let editingState = null

  if (groupField) {
    groupField.innerHTML = Object.entries(OPTION_GROUP_META).map(([key, meta]) => `
      <option value="${escapeHtml(key)}">${escapeHtml(meta.label)}</option>`).join("")
  }

  function syncOptionFormMeta() {
    const selectedMeta = OPTION_GROUP_META[groupField?.value || "audiences"]
    if (helper) helper.textContent = selectedMeta?.description || ""
  }

  function getGroupItems(groupKey) {
    return getOptionItems(settings, groupKey)
  }

  function resetOptionForm() {
    editingState = null
    form.reset()
    if (groupField && !groupField.value) groupField.value = "audiences"
    if (orderField) orderField.value = ""
    $("#optionSubmitLabel").textContent = "Save option"
    $("#cancelOptionEdit").classList.add("hidden")
    syncOptionFormMeta()
  }

  function renderOptionGroups() {
    const markup = Object.entries(OPTION_GROUP_META).map(([groupKey, meta]) => {
      const items = getGroupItems(groupKey)
      return `
        <article class="table-panel">
          <div class="panel-header">
            <div>
              <h3>${escapeHtml(meta.label)}</h3>
              <p class="section-copy">${escapeHtml(meta.description)}</p>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Label</th>
                  <th>Value</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${items.length ? items.map((item, index) => `
                  <tr>
                    <td>${escapeHtml(String(item.order || index + 1))}</td>
                    <td>${escapeHtml(item.label)}</td>
                    <td>${escapeHtml(item.value)}</td>
                    <td>
                      <div class="button-row">
                        <button class="btn-soft" type="button" data-option-edit="${escapeHtml(groupKey)}" data-option-index="${index}">Edit</button>
                        <button class="btn-danger" type="button" data-option-delete="${escapeHtml(groupKey)}" data-option-index="${index}">Delete</button>
                      </div>
                    </td>
                  </tr>`).join("") : `<tr><td colspan="4">No options saved for this group.</td></tr>`}
              </tbody>
            </table>
          </div>
        </article>`
    }).join("")

    list.innerHTML = markup

    $$("[data-option-edit]", list).forEach((button) => button.addEventListener("click", () => {
      const groupKey = button.dataset.optionEdit
      const index = Number(button.dataset.optionIndex)
      const item = getGroupItems(groupKey)[index]
      if (!item) return
      editingState = { groupKey, index }
      groupField.value = groupKey
      labelField.value = item.label
      valueField.value = item.value
      orderField.value = String(item.order || index + 1)
      $("#optionSubmitLabel").textContent = "Update option"
      $("#cancelOptionEdit").classList.remove("hidden")
      syncOptionFormMeta()
      window.scrollTo({ top: 0, behavior: "smooth" })
    }))

    $$("[data-option-delete]", list).forEach((button) => button.addEventListener("click", async () => {
      const groupKey = button.dataset.optionDelete
      const index = Number(button.dataset.optionIndex)
      const items = [...getGroupItems(groupKey)]
      const item = items[index]
      if (!item) return
      if (!window.confirm(`Delete "${item.label}" from ${OPTION_GROUP_META[groupKey]?.label || "this group"}?`)) return
      items.splice(index, 1)
      const nextItems = resequenceOptionItems(items)
      try {
        await saveOptionSettingGroup(groupKey, nextItems)
      } catch {
        return showFlash(flash, "Unable to delete option. Create the app_settings table and verify write access.", "error")
      }
      settings = { ...settings, [groupKey]: nextItems }
      showFlash(flash, "Option deleted successfully.", "success")
      renderOptionGroups()
      if (editingState && editingState.groupKey === groupKey && editingState.index === index) resetOptionForm()
    }))
  }

  groupField?.addEventListener("change", syncOptionFormMeta)
  labelField?.addEventListener("input", () => {
    if (!valueField.value.trim()) valueField.value = labelField.value.trim()
  })

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    clearFlash(flash)

    const groupKey = groupField.value
    const label = labelField.value.trim()
    const value = valueField.value.trim()
    const order = Number(orderField.value || 0) || getGroupItems(groupKey).length + 1

    if (!groupKey || !label || !value) {
      return showFlash(flash, "Group, label, and value are required.", "error")
    }

    const items = [...getGroupItems(groupKey)]
    const duplicateIndex = items.findIndex((item) => item.value.toLowerCase() === value.toLowerCase())
    if (duplicateIndex !== -1 && (!editingState || editingState.groupKey !== groupKey || editingState.index !== duplicateIndex)) {
      return showFlash(flash, "An option with the same value already exists in this group.", "error")
    }

    const nextItem = { value, label, order }
    const normalizedItems = insertOptionItemAtOrder(
      items,
      nextItem,
      order,
      editingState && editingState.groupKey === groupKey ? editingState.index : -1
    )

    try {
      await saveOptionSettingGroup(groupKey, normalizedItems)
    } catch {
      return showFlash(flash, "Unable to save option. Create the app_settings table and verify write access.", "error")
    }

    settings = { ...settings, [groupKey]: normalizedItems }
    showFlash(flash, editingState ? "Option updated successfully." : "Option added successfully.", "success")
    resetOptionForm()
    renderOptionGroups()
  })

  $("#cancelOptionEdit")?.addEventListener("click", resetOptionForm)

  resetOptionForm()
  renderOptionGroups()
}

async function initManageEvents() {
  requireAnyRole("admin", "coordinator"); initNav()
  const session = getSession()
  const isCoordinator = isCoordinatorSession(session)
  const coordinatorClub = getSessionClub(session)
  const form = $("#eventForm"), flash = $("#eventFlash"), submitLabel = $("#eventSubmitLabel"), table = $("#eventTable")
  const categoryField = $("#category")
  const clubField = $("#clubField")
  const clubSelect = $("#club")
  const otherClubField = $("#otherClub")?.closest(".field")
  const audienceField = $("#audience")
  const otherAudienceField = $("#otherAudience")?.closest(".field")
  const venueSelect = $("#venue")
  const otherVenueField = $("#otherVenue")?.closest(".field")
  const dateModeField = $("#eventDateMode")
  const endDateField = $("#eventEndDateField")
  const endDateInput = $("#eventEndDate")
  const optionSettings = await fetchOptionSettingsWithFallback()
  const clubOptions = await fetchCoordinatorClubOptions(getOptionItems(optionSettings, "clubs"))
  const venueOptions = getOptionItems(optionSettings, "venues")
  const audienceOptions = getOptionItems(optionSettings, "audiences")
  const categoryOptions = getOptionItems(optionSettings, "categories")
  const durationOptions = getOptionItems(optionSettings, "eventDurations")
  const knownClubs = clubOptions.map((item) => item.value)
  const knownVenues = venueOptions.map((item) => item.value)
  const knownAudiences = audienceOptions.map((item) => item.value)
  let editingId = null
  restrictPastDateInput($("#date"), flash, "Event date cannot be in the past.")
  restrictPastDateInput(endDateInput, flash, "Event to date cannot be in the past.")

  if (categoryField) categoryField.innerHTML = renderSelectOptions(categoryOptions, "Select category")
  const clubGrid = $(".checkbox-grid", clubSelect)
  if (clubGrid) {
    clubGrid.innerHTML = isCoordinator
      ? renderCheckboxOptions("club", clubOptions.filter((item) => item.value === coordinatorClub), false)
      : renderCheckboxOptions("club", clubOptions, true)
  }
  const audienceGrid = $(".checkbox-grid", audienceField)
  if (audienceGrid) audienceGrid.innerHTML = renderCheckboxOptions("audience", audienceOptions, true)
  if (venueSelect) venueSelect.innerHTML = renderSelectOptions([...venueOptions, { value: "Other", label: "Other" }], "Select venue")
  if (dateModeField) dateModeField.innerHTML = renderSelectOptions(durationOptions)

  function getSelectedClubs() {
    return $$('input[name="club"]:checked', clubSelect).map((input) => input.value)
  }

  function setSelectedClubs(value = "") {
    const selectedValues = String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    $$('input[name="club"]', clubSelect).forEach((input) => {
      input.checked = selectedValues.includes(input.value)
    })
    updateClubSummary()
  }

  function updateClubSummary() {
    const selectedClubs = getSelectedClubs().map((value) => value === "Other" ? ($("#otherClub").value.trim() || "Other") : value)
    const summary = $("#clubSummary")
    if (summary) summary.textContent = selectedClubs.length ? selectedClubs.join(", ") : "Select club"
  }

  function getSelectedAudiences() {
    return $$('input[name="audience"]:checked', audienceField).map((input) => input.value)
  }

  function setSelectedAudiences(value = "") {
    const selectedValues = String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    $$('input[name="audience"]', audienceField).forEach((input) => {
      input.checked = selectedValues.includes(input.value)
    })
    updateAudienceSummary()
  }

  function updateAudienceSummary() {
    const selectedAudiences = getSelectedAudiences().map((value) => value === "Other" ? ($("#otherAudience").value.trim() || "Other") : value)
    const summary = $("#audienceSummary")
    if (summary) summary.textContent = selectedAudiences.length ? selectedAudiences.join(", ") : "Select audience"
  }

  function syncEventDateUI() {
    const isMultipleDays = String(dateModeField?.value || "").toLowerCase() === "multiple"
    endDateField?.classList.toggle("hidden", !isMultipleDays)
    const startDate = $("#date").value
    if (endDateInput) {
      endDateInput.required = isMultipleDays
      endDateInput.min = startDate || todayISO()
      if (!isMultipleDays) endDateInput.value = ""
    }
    const label = $("#eventStartDateLabel")
    if (label) label.textContent = isMultipleDays ? "From date" : "Date"
  }

  function syncCategoryUI() {
    const isExternal = String(categoryField?.value || "").toLowerCase() === "external"
    clubField?.classList.toggle("hidden", isExternal)
    if (isExternal && clubSelect && !isCoordinator) setSelectedClubs("")
    syncClubUI()
  }

  function syncClubUI() {
    const showOtherClub = categoryField?.value !== "External" && getSelectedClubs().includes("Other")
    otherClubField?.classList.toggle("hidden", !showOtherClub)
    if (!showOtherClub && $("#otherClub")) $("#otherClub").value = ""
    updateClubSummary()
  }

  function syncAudienceUI() {
    const showOtherAudience = getSelectedAudiences().includes("Other")
    otherAudienceField?.classList.toggle("hidden", !showOtherAudience)
    if (!showOtherAudience && $("#otherAudience")) $("#otherAudience").value = ""
    updateAudienceSummary()
  }

  function syncVenueUI() {
    const showOtherVenue = venueSelect?.value === "Other"
    otherVenueField?.classList.toggle("hidden", !showOtherVenue)
    if (!showOtherVenue && $("#otherVenue")) $("#otherVenue").value = ""
  }

  function resetForm() {
    editingId = null
    form.reset()
    submitLabel.textContent = "Save event"
    $("#cancelEventEdit").classList.add("hidden")
    if (isCoordinator && coordinatorClub) setSelectedClubs(coordinatorClub)
    syncCategoryUI()
    syncAudienceUI()
    syncVenueUI()
    syncEventDateUI()
  }

  async function loadEvents() {
    const rows = (await fetchTable("events").catch(() => [])).map(normalizeEvent)
    const visibleRows = rows
      .filter((item) => !isCoordinator || itemBelongsToClub(item.club, coordinatorClub))
      .filter((item) => isVisiblePublishedItem(item.date, item.time, item.endDate))
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))

    table.innerHTML = visibleRows.length ? visibleRows.map((item) => `<tr><td>${item.theme}</td><td>${safeText(item.resourcePerson)}</td><td>${safeText(item.facultyCoordinator)}</td><td>${safeText(item.studentCoordinator)}</td><td>${safeText(item.category)}</td><td>${safeText(item.club)}</td><td>${formatDate(item.date)}</td><td>${item.endDate ? formatDate(item.endDate) : "-"}</td><td>${formatTime(item.time)}</td><td>${safeText(item.venue)}</td><td>${safeText(item.audience)}</td><td>${item.bannerImage ? `<a class="btn-soft" href="${item.bannerImage}" target="_blank" rel="noreferrer">View image</a>` : "No image"}</td><td>${item.brochureLink ? `<a class="btn-soft" href="${item.brochureLink}" target="_blank" rel="noreferrer">Open</a>` : "No brochure"}</td><td><div class="button-row"><button class="btn-soft" data-edit="${item.id}">Edit</button><button class="btn-danger" data-delete="${item.id}">Delete</button></div></td></tr>`).join("") : `<tr><td colspan="14">No active or upcoming events available.</td></tr>`
    $$("[data-edit]", table).forEach((button) => button.addEventListener("click", async () => {
      const { data } = await supabaseClient.from("events").select("*").eq("id", button.dataset.edit).single()
      const item = normalizeEvent(data); editingId = item.id; submitLabel.textContent = "Update event"; $("#cancelEventEdit").classList.remove("hidden")
      ensureSelectHasValue(categoryField, item.category)
      $("#theme").value = item.theme
      $("#category").value = item.category
      syncCategoryUI()
      const clubValues = String(item.club || "").split(",").map((value) => value.trim()).filter(Boolean)
      const knownClubValues = clubValues.filter((value) => knownClubs.includes(value))
      const customClubValues = clubValues.filter((value) => !knownClubs.includes(value))
      setSelectedClubs([...knownClubValues, customClubValues.length ? "Other" : ""].filter(Boolean).join(", "))
      $("#otherClub").value = customClubValues.join(", ")
      syncClubUI()
      $("#date").value = item.date
      if (dateModeField) {
        ensureSelectHasValue(dateModeField, item.endDate ? "multiple" : "single", item.endDate ? "Multiple days" : "Single day")
        dateModeField.value = item.endDate ? "multiple" : "single"
      }
      if (endDateInput) endDateInput.value = item.endDate
      syncEventDateUI()
      $("#time").value = item.time
      if (knownVenues.includes(item.venue)) {
        $("#venue").value = item.venue
        $("#otherVenue").value = ""
      } else {
        $("#venue").value = item.venue ? "Other" : ""
        $("#otherVenue").value = item.venue
      }
      syncVenueUI()
      $("#resourcePerson").value = item.resourcePerson
      $("#facultyCoordinator").value = item.facultyCoordinator
      $("#studentCoordinator").value = item.studentCoordinator
      const audienceValues = String(item.audience || "").split(",").map((value) => value.trim()).filter(Boolean)
      const knownAudienceValues = audienceValues.filter((value) => knownAudiences.includes(value))
      const customAudienceValues = audienceValues.filter((value) => !knownAudiences.includes(value))
      setSelectedAudiences([...knownAudienceValues, customAudienceValues.length ? "Other" : ""].filter(Boolean).join(", "))
      $("#otherAudience").value = customAudienceValues.join(", ")
      syncAudienceUI()
      window.scrollTo({ top: 0, behavior: "smooth" })
    }))
    $$("[data-delete]", table).forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Delete this event?")) return
      const { error } = await supabaseClient.from("events").delete().eq("id", button.dataset.delete)
      if (error) return showFlash(flash, "Unable to delete event.", "error")
      showFlash(flash, "Event deleted.", "success"); loadEvents()
    }))
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); clearFlash(flash)
    const eventDate = $("#date").value
    const eventEndDate = dateModeField?.value === "multiple" ? endDateInput?.value || "" : null
    if (isPastDateValue(eventDate)) return showFlash(flash, "Event date cannot be in the past.", "error")
    if (isPastDateValue(eventEndDate)) return showFlash(flash, "Event to date cannot be in the past.", "error")
    const file = $("#brochureFile").files[0]
    const imageFile = $("#eventImageFile").files[0]
    let brochureLink = ""
    let bannerImage = ""
    try {
      if (file) {
        brochureLink = await uploadFile(file, "brochures")
      } else if (editingId) {
        const { data: existingEvent } = await supabaseClient.from("events").select("brochureLink,bannerImage").eq("id", editingId).single()
        brochureLink = existingEvent?.brochureLink || ""
        bannerImage = existingEvent?.bannerImage || ""
      }
      if (imageFile) bannerImage = await uploadFile(imageFile, "event-images")
    } catch (error) { return showFlash(flash, error.message, "error") }
    const selectedVenue = $("#venue").value
    const selectedAudiences = getSelectedAudiences()
    const selectedClubs = getSelectedClubs()
    const customAudience = $("#otherAudience").value.trim()
    const audienceValues = selectedAudiences
      .filter((value) => value !== "Other")
      .concat(selectedAudiences.includes("Other") && customAudience ? [customAudience] : [])
    const customClub = $("#otherClub").value.trim()
    const clubValues = selectedClubs
      .filter((value) => value !== "Other")
      .concat(selectedClubs.includes("Other") && customClub ? [customClub] : [])
    const payload = {
      theme: $("#theme").value.trim(),
      category: $("#category").value,
      club: isCoordinator ? coordinatorClub : (categoryField?.value === "External" ? "" : clubValues.join(", ")),
      date: eventDate,
      endDate: eventEndDate,
      time: $("#time").value,
      venue: selectedVenue === "Other" ? $("#otherVenue").value.trim() : selectedVenue,
      resourcePerson: $("#resourcePerson").value.trim(),
      facultyCoordinator: $("#facultyCoordinator").value.trim(),
      studentCoordinator: $("#studentCoordinator").value.trim(),
      audience: audienceValues.join(", "),
      bannerImage,
      brochureLink
    }
    if (selectedClubs.includes("Other") && !customClub) return showFlash(flash, "Enter the other club name.", "error")
    if (selectedAudiences.includes("Other") && !customAudience) return showFlash(flash, "Enter the other audience.", "error")
    if (payload.endDate && payload.endDate < payload.date) return showFlash(flash, "To date cannot be before from date.", "error")
    if (!payload.theme || !payload.category || !payload.date || !payload.time || !payload.venue) return showFlash(flash, "Theme, category, date, time and venue are required.", "error")
    if (dateModeField?.value === "multiple" && !payload.endDate) return showFlash(flash, "To date is required for multiple-day events.", "error")
    const action = editingId ? supabaseClient.from("events").update(payload).eq("id", editingId) : supabaseClient.from("events").insert([payload])
    const { error } = await action
    if (error) return showFlash(flash, "Unable to save event. Verify table columns and write policies.", "error")
    showFlash(flash, editingId ? "Event updated successfully." : "Event created successfully.", "success"); resetForm(); loadEvents()
  })
  categoryField?.addEventListener("change", syncCategoryUI)
  $$('input[name="club"]', clubSelect).forEach((input) => input.addEventListener("change", syncClubUI))
  $("#otherClub")?.addEventListener("input", updateClubSummary)
  $$('input[name="audience"]', audienceField).forEach((input) => input.addEventListener("change", syncAudienceUI))
  $("#otherAudience")?.addEventListener("input", updateAudienceSummary)
  venueSelect?.addEventListener("change", syncVenueUI)
  dateModeField?.addEventListener("change", syncEventDateUI)
  $("#date")?.addEventListener("change", syncEventDateUI)
  $("#cancelEventEdit").addEventListener("click", resetForm)
  syncCategoryUI()
  syncClubUI()
  syncAudienceUI()
  syncVenueUI()
  syncEventDateUI()
  if (isCoordinator && coordinatorClub) {
    setSelectedClubs(coordinatorClub)
    $$('input[name="club"]', clubSelect).forEach((input) => { input.disabled = true })
  }
  await loadEvents()
  window.setInterval(loadEvents, 60000)
}

async function initManageCompetitions() {
  requireAnyRole("admin", "coordinator"); initNav()
  const session = getSession()
  const isCoordinator = isCoordinatorSession(session)
  const coordinatorClub = getSessionClub(session)
  const form = $("#competitionForm"), flash = $("#competitionFlash"), table = $("#competitionTable"), eventSelect = $("#eventId")
  const competitionTypeField = $("#competition_type")
  const categoryField = $("#category")
  const clubField = $("#competitionClubField")
  const clubSelect = $("#club")
  const otherClubField = $("#otherClub")?.closest(".field")
  const audienceField = $("#audience")
  const otherAudienceField = $("#otherAudience")?.closest(".field")
  const teamLimitWrap = $("#teamLimitWrap")
  const otherEventField = $("#otherEventId")?.closest(".field")
  const venueSelect = $("#venue")
  const otherVenueField = $("#otherVenue")?.closest(".field")
  const dateModeField = $("#competitionDateMode")
  const endDateField = $("#competitionEndDateField")
  const endDateInput = $("#competitionEndDate")
  const optionSettings = await fetchOptionSettingsWithFallback()
  const clubOptions = await fetchCoordinatorClubOptions(getOptionItems(optionSettings, "clubs"))
  const venueOptions = getOptionItems(optionSettings, "venues")
  const categoryOptions = getOptionItems(optionSettings, "categories")
  const competitionTypeOptions = getOptionItems(optionSettings, "competitionTypes")
  const durationOptions = getOptionItems(optionSettings, "competitionDurations")
  const audienceOptions = getOptionItems(optionSettings, "audiences")
  const knownClubs = clubOptions.map((item) => item.value)
  const knownVenues = venueOptions.map((item) => item.value)
  const knownAudiences = audienceOptions.map((item) => item.value)
  let editingId = null
  restrictPastDateInput($("#competitionDate"), flash, "Competition date cannot be in the past.")
  restrictPastDateInput(endDateInput, flash, "Competition to date cannot be in the past.")
  const events = (await fetchTable("events").catch(() => [])).map(normalizeEvent)
  if (competitionTypeField) competitionTypeField.innerHTML = renderSelectOptions(competitionTypeOptions)
  if (categoryField) categoryField.innerHTML = renderSelectOptions(categoryOptions, "Select category")
  const clubGrid = $(".checkbox-grid", clubSelect)
  if (clubGrid) {
    clubGrid.innerHTML = isCoordinator
      ? renderCheckboxOptions("club", clubOptions.filter((item) => item.value === coordinatorClub), false)
      : renderCheckboxOptions("club", clubOptions, true)
  }
  if (dateModeField) dateModeField.innerHTML = renderSelectOptions(durationOptions)
  if (venueSelect) venueSelect.innerHTML = renderSelectOptions([...venueOptions, { value: "Other", label: "Other" }], "Select venue")
  const audienceGrid = $(".checkbox-grid", audienceField)
  if (audienceGrid) audienceGrid.innerHTML = renderCheckboxOptions("audience", audienceOptions, true)
  const availableEvents = isCoordinator ? events.filter((item) => itemBelongsToClub(item.club, coordinatorClub)) : events
  eventSelect.innerHTML = `<option value="">Linked event (optional)</option>${availableEvents.map((item) => `<option value="${escapeHtml(item.theme)}">${escapeHtml(item.theme)}</option>`).join("")}<option value="Other">Other</option>`

  function getSelectedClubs() {
    return $$('input[name="club"]:checked', clubSelect).map((input) => input.value)
  }

  function setSelectedClubs(value = "") {
    const selectedValues = String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    $$('input[name="club"]', clubSelect).forEach((input) => {
      input.checked = selectedValues.includes(input.value)
    })
    updateClubSummary()
  }

  function updateClubSummary() {
    const selectedClubs = getSelectedClubs().map((value) => value === "Other" ? ($("#otherClub").value.trim() || "Other") : value)
    const summary = $("#clubSummary")
    if (summary) summary.textContent = selectedClubs.length ? selectedClubs.join(", ") : "Select club"
  }

  function getSelectedAudiences() {
    return $$('input[name="audience"]:checked', audienceField).map((input) => input.value)
  }

  function setSelectedAudiences(value = "") {
    const selectedValues = String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    $$('input[name="audience"]', audienceField).forEach((input) => {
      input.checked = selectedValues.includes(input.value)
    })
    updateAudienceSummary()
  }

  function updateAudienceSummary() {
    const selectedAudiences = getSelectedAudiences().map((value) => value === "Other" ? ($("#otherAudience").value.trim() || "Other") : value)
    const summary = $("#audienceSummary")
    if (summary) summary.textContent = selectedAudiences.length ? selectedAudiences.join(", ") : "Select audience"
  }

  function syncCompetitionDateUI() {
    const isMultipleDays = String(dateModeField?.value || "").toLowerCase() === "multiple"
    endDateField?.classList.toggle("hidden", !isMultipleDays)
    const startDate = $("#competitionDate").value
    if (endDateInput) {
      endDateInput.required = isMultipleDays
      endDateInput.min = startDate || todayISO()
      if (!isMultipleDays) endDateInput.value = ""
    }
    const label = $("#competitionStartDateLabel")
    if (label) label.textContent = isMultipleDays ? "From date" : "Date"
  }

  function syncCompetitionTypeUI() {
    const showTeamFields = String(competitionTypeField?.value || "").toLowerCase() === "group"
    teamLimitWrap?.classList.toggle("hidden", !showTeamFields)
    $("#maxTeamLimitWrap")?.classList.toggle("hidden", !showTeamFields)
    if (!showTeamFields) {
      if ($("#minTeamLimit")) $("#minTeamLimit").value = ""
      if ($("#maxTeamLimit")) $("#maxTeamLimit").value = ""
    }
  }

  function syncCategoryUI() {
    const isExternal = String(categoryField?.value || "").toLowerCase() === "external"
    clubField?.classList.toggle("hidden", isExternal)
    if (isExternal && clubSelect && !isCoordinator) setSelectedClubs("")
    syncClubUI()
  }

  function syncClubUI() {
    const showOtherClub = categoryField?.value !== "External" && getSelectedClubs().includes("Other")
    otherClubField?.classList.toggle("hidden", !showOtherClub)
    if (!showOtherClub && $("#otherClub")) $("#otherClub").value = ""
    updateClubSummary()
  }

  function syncAudienceUI() {
    const showOtherAudience = getSelectedAudiences().includes("Other")
    otherAudienceField?.classList.toggle("hidden", !showOtherAudience)
    if (!showOtherAudience && $("#otherAudience")) $("#otherAudience").value = ""
    updateAudienceSummary()
  }

  function syncEventUI() {
    const showOtherEvent = eventSelect?.value === "Other"
    otherEventField?.classList.toggle("hidden", !showOtherEvent)
    if (!showOtherEvent && $("#otherEventId")) $("#otherEventId").value = ""
  }

  function syncVenueUI() {
    const showOtherVenue = venueSelect?.value === "Other"
    otherVenueField?.classList.toggle("hidden", !showOtherVenue)
    if (!showOtherVenue && $("#otherVenue")) $("#otherVenue").value = ""
  }

  function resetForm() {
    editingId = null
    form.reset()
    $("#cancelCompetitionEdit").classList.add("hidden")
    $("#competitionSubmitLabel").textContent = "Save competition"
    if (isCoordinator && coordinatorClub) setSelectedClubs(coordinatorClub)
    syncCompetitionTypeUI()
    syncCategoryUI()
    syncClubUI()
    syncAudienceUI()
    syncEventUI()
    syncVenueUI()
    syncCompetitionDateUI()
  }

  async function loadCompetitions() {
    const rows = (await fetchTable("competitions").catch(() => [])).map(normalizeCompetition)
    const visibleRows = rows
      .filter((item) => !isCoordinator || itemBelongsToClub(item.club, coordinatorClub))
      .filter((item) => isVisiblePublishedItem(item.competitionDate, item.time, item.competitionEndDate))
      .sort((a, b) => (a.competitionDate || "").localeCompare(b.competitionDate || ""))

    table.innerHTML = visibleRows.length ? visibleRows.map((item) => {
      const typeLabel = item.competition_type === "Group"
        ? `Group(${item.minTeamLimit || 2}-${item.maxTeamLimit || item.teamLimit || 2})`
        : item.competition_type
      return `<tr><td>${item.theme}</td><td>${typeLabel}</td><td>${safeText(item.category)}</td><td>${safeText(item.club)}</td><td>${safeText(item.eventId)}</td><td>${formatDate(item.competitionDate)}</td><td>${item.competitionEndDate ? formatDate(item.competitionEndDate) : "-"}</td><td>${formatTime(item.time)}</td><td>${safeText(item.venue)}</td><td>${safeText(item.audience)}</td><td>${safeText(item.facultyCoordinator)}</td><td>${safeText(item.studentCoordinator)}</td><td>${item.bannerImage ? `<a class="btn-soft" href="${item.bannerImage}" target="_blank" rel="noreferrer">View image</a>` : "No image"}</td><td>${item.rulesLink ? `<a class="btn-soft" href="${item.rulesLink}" target="_blank" rel="noreferrer">Open</a>` : "No Rules"}</td><td><div class="button-row"><button class="btn-soft" data-edit="${item.id}">Edit</button><button class="btn-danger" data-delete="${item.id}">Delete</button></div></td></tr>`
    }).join("") : `<tr><td colspan="15">No active or upcoming competitions available.</td></tr>`
    $$("[data-edit]", table).forEach((button) => button.addEventListener("click", async () => {
      const { data } = await supabaseClient.from("competitions").select("*").eq("id", button.dataset.edit).single()
      const item = normalizeCompetition(data); editingId = item.id; $("#competitionSubmitLabel").textContent = "Update competition"; $("#cancelCompetitionEdit").classList.remove("hidden")
      $("#theme").value = item.theme
      ensureSelectHasValue(competitionTypeField, item.competition_type)
      $("#competition_type").value = item.competition_type
      syncCompetitionTypeUI()
      $("#minTeamLimit").value = item.minTeamLimit || ""
      $("#maxTeamLimit").value = item.maxTeamLimit || item.teamLimit || ""
      ensureSelectHasValue(categoryField, item.category)
      $("#category").value = item.category
      syncCategoryUI()
      const clubValues = String(item.club || "").split(",").map((value) => value.trim()).filter(Boolean)
      const knownClubValues = clubValues.filter((value) => knownClubs.includes(value))
      const customClubValues = clubValues.filter((value) => !knownClubs.includes(value))
      setSelectedClubs([...knownClubValues, customClubValues.length ? "Other" : ""].filter(Boolean).join(", "))
      $("#otherClub").value = customClubValues.join(", ")
      syncClubUI()
      const audienceValues = String(item.audience || "").split(",").map((value) => value.trim()).filter(Boolean)
      const knownAudienceValues = audienceValues.filter((value) => knownAudiences.includes(value))
      const customAudienceValues = audienceValues.filter((value) => !knownAudiences.includes(value))
      setSelectedAudiences([...knownAudienceValues, customAudienceValues.length ? "Other" : ""].filter(Boolean).join(", "))
      $("#otherAudience").value = customAudienceValues.join(", ")
      syncAudienceUI()
      const eventOptions = [...eventSelect.options].map((option) => option.value)
      if (item.eventId && !eventOptions.includes(item.eventId)) {
        $("#eventId").value = "Other"
        $("#otherEventId").value = item.eventId
      } else {
      $("#eventId").value = item.eventId
      $("#otherEventId").value = ""
      }
      syncEventUI()
      $("#competitionDate").value = item.competitionDate
      if (dateModeField) {
        ensureSelectHasValue(dateModeField, item.competitionEndDate ? "multiple" : "single", item.competitionEndDate ? "Multiple days" : "Single day")
        dateModeField.value = item.competitionEndDate ? "multiple" : "single"
      }
      if (endDateInput) endDateInput.value = item.competitionEndDate
      syncCompetitionDateUI()
      $("#time").value = item.time
      if (knownVenues.includes(item.venue)) {
        $("#venue").value = item.venue
        $("#otherVenue").value = ""
      } else {
        $("#venue").value = item.venue ? "Other" : ""
        $("#otherVenue").value = item.venue
      }
      syncVenueUI()
      $("#facultyCoordinator").value = item.facultyCoordinator
      $("#studentCoordinator").value = item.studentCoordinator
      window.scrollTo({ top: 0, behavior: "smooth" })
    }))
    $$("[data-delete]", table).forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Delete this competition?")) return
      const { error } = await supabaseClient.from("competitions").delete().eq("id", button.dataset.delete)
      if (error) return showFlash(flash, "Unable to delete competition.", "error")
      showFlash(flash, "Competition deleted.", "success"); loadCompetitions()
    }))
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); clearFlash(flash)
    const competitionDate = $("#competitionDate").value
    const competitionEndDate = dateModeField?.value === "multiple" ? endDateInput?.value || "" : null
    if (isPastDateValue(competitionDate)) return showFlash(flash, "Competition date cannot be in the past.", "error")
    if (isPastDateValue(competitionEndDate)) return showFlash(flash, "Competition to date cannot be in the past.", "error")
    const file = $("#rulesFile").files[0]
    const imageFile = $("#competitionImageFile").files[0]
    let rulesLink = ""
    let bannerImage = ""
    try {
      if (file) {
        rulesLink = await uploadFile(file, "rules")
      } else if (editingId) {
        const { data: existingCompetition } = await supabaseClient.from("competitions").select("rulesLink,bannerImage").eq("id", editingId).single()
        rulesLink = existingCompetition?.rulesLink || ""
        bannerImage = existingCompetition?.bannerImage || ""
      }
      if (imageFile) bannerImage = await uploadFile(imageFile, "competition-images")
    } catch (error) { return showFlash(flash, error.message, "error") }
    const selectedVenue = $("#venue").value
    const selectedEvent = $("#eventId").value
    const selectedType = $("#competition_type").value
    const selectedClubs = getSelectedClubs()
    const selectedAudiences = getSelectedAudiences()
    const isGroupType = String(selectedType || "").toLowerCase() === "group"
    const minTeamLimit = isGroupType ? Number($("#minTeamLimit").value || 0) : null
    const maxTeamLimit = isGroupType ? Number($("#maxTeamLimit").value || 0) : null
    const customClub = $("#otherClub").value.trim()
    const clubValues = selectedClubs
      .filter((value) => value !== "Other")
      .concat(selectedClubs.includes("Other") && customClub ? [customClub] : [])
    const customAudience = $("#otherAudience").value.trim()
    const audienceValues = selectedAudiences
      .filter((value) => value !== "Other")
      .concat(selectedAudiences.includes("Other") && customAudience ? [customAudience] : [])

    if (isGroupType && (!minTeamLimit || !maxTeamLimit)) {
      return showFlash(flash, "For group competitions, minimum and maximum team limits are required.", "error")
    }

    if (isGroupType && (minTeamLimit < 2 || minTeamLimit > 10 || maxTeamLimit < 2 || maxTeamLimit > 10)) {
      return showFlash(flash, "Minimum and maximum team limits must be between 2 and 10.", "error")
    }

    if (isGroupType && minTeamLimit > maxTeamLimit) {
      return showFlash(flash, "Minimum team limit cannot be greater than maximum team limit.", "error")
    }

    const payload = {
      theme: $("#theme").value.trim(),
      competition_type: selectedType,
      min_team_limit: minTeamLimit,
      max_team_limit: maxTeamLimit,
      category: $("#category").value,
      club: isCoordinator ? coordinatorClub : (categoryField?.value === "External" ? "" : clubValues.join(", ")),
      eventId: selectedEvent === "Other" ? $("#otherEventId").value.trim() : selectedEvent,
      competitionDate,
      competitionEndDate,
      time: $("#time").value,
      venue: selectedVenue === "Other" ? $("#otherVenue").value.trim() : selectedVenue,
      audience: audienceValues.join(", "),
      facultyCoordinator: $("#facultyCoordinator").value.trim(),
      studentCoordinator: $("#studentCoordinator").value.trim(),
      bannerImage,
      rulesLink
    }
    if (selectedClubs.includes("Other") && !customClub) return showFlash(flash, "Enter the other club name.", "error")
    if (selectedAudiences.includes("Other") && !customAudience) return showFlash(flash, "Enter the other audience.", "error")
    if (payload.competitionEndDate && payload.competitionEndDate < payload.competitionDate) return showFlash(flash, "To date cannot be before from date.", "error")
    if (!payload.theme || !payload.competition_type || !payload.category || !payload.competitionDate || !payload.venue) return showFlash(flash, "Theme, type, category, date and venue are required.", "error")
    if (dateModeField?.value === "multiple" && !payload.competitionEndDate) return showFlash(flash, "To date is required for multiple-day competitions.", "error")
    const action = editingId ? supabaseClient.from("competitions").update(payload).eq("id", editingId) : supabaseClient.from("competitions").insert([payload])
    const { error } = await action
    if (error) return showFlash(flash, "Unable to save competition. Verify table columns and write policies.", "error")
    showFlash(flash, editingId ? "Competition updated successfully." : "Competition created successfully.", "success"); resetForm(); loadCompetitions()
  })
  competitionTypeField?.addEventListener("change", syncCompetitionTypeUI)
  categoryField?.addEventListener("change", syncCategoryUI)
  $$('input[name="club"]', clubSelect).forEach((input) => input.addEventListener("change", syncClubUI))
  $("#otherClub")?.addEventListener("input", updateClubSummary)
  $$('input[name="audience"]', audienceField).forEach((input) => input.addEventListener("change", syncAudienceUI))
  $("#otherAudience")?.addEventListener("input", updateAudienceSummary)
  eventSelect?.addEventListener("change", syncEventUI)
  venueSelect?.addEventListener("change", syncVenueUI)
  dateModeField?.addEventListener("change", syncCompetitionDateUI)
  $("#competitionDate")?.addEventListener("change", syncCompetitionDateUI)
  $("#cancelCompetitionEdit").addEventListener("click", resetForm)
  syncCompetitionTypeUI()
  syncCategoryUI()
  syncClubUI()
  syncAudienceUI()
  syncEventUI()
  syncVenueUI()
  syncCompetitionDateUI()
  if (isCoordinator && coordinatorClub) {
    setSelectedClubs(coordinatorClub)
    $$('input[name="club"]', clubSelect).forEach((input) => { input.disabled = true })
  }
  await loadCompetitions()
  window.setInterval(loadCompetitions, 60000)
}

async function initManageHighlights() {
  requireRole("admin"); initNav()
  const form = $("#highlightForm"), flash = $("#highlightFlash"), list = $("#highlightList")
  const titleField = $("#highlightMediaTitle")
  const orderField = $("#highlightDisplayOrder")
  const fileField = $("#highlightMediaFile")
  const preview = $("#highlightMediaPreview")
  let editingId = null

  function updatePreview(url = "", mediaType = "") {
    if (!preview) return
    preview.innerHTML = url
      ? renderHighlightMedia(url, mediaType, "Selected highlight media")
      : `<div class="empty-state">Choose a video URL or upload a file to preview it here.</div>`
  }

  function resetForm() {
    editingId = null
    form.reset()
    if (fileField) fileField.value = ""
    $("#cancelHighlightEdit").classList.add("hidden")
    $("#highlightSubmitLabel").textContent = "Save video"
    if (orderField) orderField.value = "0"
    updatePreview()
  }

  async function loadHighlights() {
    const rows = (await fetchTable("highlights").catch(() => [])).map(normalizeHighlight).sort((a, b) => a.display_order - b.display_order)
    list.innerHTML = rows.length ? rows.map((item, index) => `
      <article class="content-card highlight-media-card">
        <div class="highlight-media-frame">${renderHighlightMedia(item.media_url, item.media_type, item.title)}</div>
        <div class="title-row">
          <h3>${escapeHtml(item.title || `Slide ${index + 1}`)}</h3>
          <span class="tag">Order ${escapeHtml(item.display_order)}</span>
        </div>
        <div class="highlight-media-meta">
          <span class="pill">${escapeHtml((item.media_type || inferMediaType(item.media_url) || "media").toUpperCase())}</span>
          <span>Slide ${index + 1}</span>
        </div>
        <div class="button-row">
          <button class="btn-soft" data-edit="${item.id}">Edit</button>
          <button class="btn-danger" data-delete="${item.id}">Delete</button>
        </div>
      </article>`).join("") : renderEmpty("No dashboard media available yet.")
    $$("[data-edit]", list).forEach((button) => button.addEventListener("click", async () => {
      const { data } = await supabaseClient.from("highlights").select("*").eq("id", button.dataset.edit).single()
      const item = normalizeHighlight(data)
      editingId = item.id
      $("#highlightSubmitLabel").textContent = "Update video"
      $("#cancelHighlightEdit").classList.remove("hidden")
      if (titleField) titleField.value = item.title || ""
      if (orderField) orderField.value = String(item.display_order || 0)
      if (fileField) fileField.value = ""
      updatePreview(item.media_url, item.media_type)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }))
    $$("[data-delete]", list).forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Delete this dashboard media?")) return
      const { error } = await supabaseClient.from("highlights").delete().eq("id", button.dataset.delete)
      if (error) return showFlash(flash, "Unable to delete dashboard media.", "error")
      showFlash(flash, "Dashboard media deleted.", "success"); loadHighlights()
    }))
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); clearFlash(flash)
    const file = fileField?.files[0]
    let media_url = editingId ? "" : ""
    if (file) media_url = `assets/highlights/${file.name}`
    if (!file && editingId) {
      const { data } = await supabaseClient.from("highlights").select("*").eq("id", editingId).single()
      media_url = normalizeHighlight(data).media_url || ""
    }
    const media_type = file?.type.startsWith("video/") ? "video" : inferMediaType(media_url)
    if (!media_url) return showFlash(flash, "Choose a video file before saving.", "error")
    if (media_type !== "video") return showFlash(flash, "Only video files are supported for the student dashboard slideshow.", "error")
    const existingRows = editingId ? [] : (await fetchTable("highlights").catch(() => [])).map(normalizeHighlight)
    const nextOrder = Number(orderField?.value || 0)
    const payload = {
      title: titleField?.value.trim() || `Dashboard Video ${Date.now()}`,
      subtitle: "",
      image_url: media_url,
      cta_link: "",
      category: media_type,
      display_order: Number.isFinite(nextOrder) ? nextOrder : existingRows.length
    }
    const action = editingId ? supabaseClient.from("highlights").update(payload).eq("id", editingId) : supabaseClient.from("highlights").insert([payload])
    const { error } = await action
    if (error) return showFlash(flash, "Unable to save dashboard video. Verify table columns and write policies.", "error")
    showFlash(flash, editingId ? "Dashboard video updated successfully." : "Dashboard video added successfully.", "success"); resetForm(); loadHighlights()
  })
  fileField?.addEventListener("change", () => {
    const file = fileField.files?.[0]
    if (!file) return updatePreview()
    updatePreview(URL.createObjectURL(file), "video")
  })
  $("#cancelHighlightEdit").addEventListener("click", resetForm)
  await loadHighlights()
  updatePreview()
}

async function initManageContacts() {
  requireRole("admin")
  initNav()

  const form = $("#contactForm")
  const flash = $("#contactFlash")
  const table = $("#contactTable")
  const typeField = $("#contactType")
  const supportTitleField = $("#supportTitleField")
  const supportEmailField = $("#supportEmailField")
  const supportPhoneField = $("#supportPhoneField")
  const supportTimingField = $("#supportTimingField")
  const supportAddressField = $("#supportAddressField")
  const clubNameField = $("#clubNameField")
  const facultyCoordinatorField = $("#facultyCoordinatorField")
  const facultyCoordinatorEmailField = $("#facultyCoordinatorEmailField")
  const facultyCoordinatorPhoneField = $("#facultyCoordinatorPhoneField")
  const studentCoordinatorCountField = $("#studentCoordinatorCountField")
  const studentCoordinatorEntriesField = $("#studentCoordinatorEntriesField")
  const typeFilter = $("#contactTypeFilter")
  const clubFilter = $("#contactClubFilter")
  const searchField = $("#contactSearch")
  const downloadButton = $("#downloadContactsDoc")
  const optionSettings = await fetchOptionSettingsWithFallback()
  const classOptions = getOptionItems(optionSettings, "studentClasses")
  let editingId = null
  let contacts = []

  function syncContactTypeUI() {
    const isSupport = typeField?.value === "support"
    supportTitleField?.classList.toggle("hidden", !isSupport)
    supportEmailField?.classList.toggle("hidden", !isSupport)
    supportPhoneField?.classList.toggle("hidden", !isSupport)
    supportTimingField?.classList.toggle("hidden", !isSupport)
    supportAddressField?.classList.toggle("hidden", !isSupport)
    clubNameField?.classList.toggle("hidden", isSupport)
    facultyCoordinatorField?.classList.toggle("hidden", isSupport)
    facultyCoordinatorEmailField?.classList.toggle("hidden", isSupport)
    facultyCoordinatorPhoneField?.classList.toggle("hidden", isSupport)
    studentCoordinatorCountField?.classList.toggle("hidden", isSupport)
    studentCoordinatorEntriesField?.classList.toggle("hidden", isSupport)
    const timingInput = $("#supportTiming")
    if (!isSupport && timingInput) timingInput.value = ""
  }

  function renderStudentCoordinatorFields(count = 0, names = [], classes = [], emails = [], phones = []) {
    const container = $("#studentCoordinatorEntries")
    if (!container) return
    const total = Math.max(0, Number(count) || 0)
    container.innerHTML = total
      ? Array.from({ length: total }, (_, index) => `
          <div class="team-member-row coordinator-entry-row">
            <div class="field">
              <label for="studentCoordinatorName${index}">Student Coordinator ${index + 1}</label>
              <input id="studentCoordinatorName${index}" type="text" value="${escapeHtml(names[index] || "")}" placeholder="Enter student name">
            </div>
            <div class="field">
              <label for="studentCoordinatorClass${index}">Class</label>
              <select id="studentCoordinatorClass${index}">
                ${renderClassOptions(classOptions, classes[index] || "")}
              </select>
            </div>
            <div class="field">
              <label for="studentCoordinatorEmail${index}">Email</label>
              <input id="studentCoordinatorEmail${index}" type="email" value="${escapeHtml(emails[index] || "")}" placeholder="student@trishaems.edu">
            </div>
            <div class="field">
              <label for="studentCoordinatorPhone${index}">Phone</label>
              <input id="studentCoordinatorPhone${index}" type="text" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" value="${escapeHtml(phones[index] || "")}" placeholder="9876543210">
            </div>
          </div>`).join("")
      : `<div class="empty-state">Coordinator fields will appear here.</div>`
  }

  function getStudentCoordinatorPayload() {
    const count = Number($("#studentCoordinatorCount")?.value || 0)
    const names = []
    const classes = []
    const emails = []
    const phones = []

    for (let index = 0; index < count; index += 1) {
      names.push($(`#studentCoordinatorName${index}`)?.value.trim() || "")
      classes.push($(`#studentCoordinatorClass${index}`)?.value || "")
      emails.push($(`#studentCoordinatorEmail${index}`)?.value.trim() || "")
      phones.push($(`#studentCoordinatorPhone${index}`)?.value.trim() || "")
    }

    return {
      count,
      names,
      classes,
      emails,
      phones,
      studentCoordinator: names.filter(Boolean).join("\n"),
      studentCoordinatorClass: classes.filter(Boolean).join("\n"),
      studentCoordinatorEmail: emails.filter(Boolean).join("\n"),
      studentCoordinatorPhone: phones.filter(Boolean).join("\n")
    }
  }

  function rerenderStudentCoordinatorFieldsPreservingValues(nextCount) {
    const current = getStudentCoordinatorPayload()
    renderStudentCoordinatorFields(nextCount, current.names, current.classes, current.emails, current.phones)
  }

  function sortContacts(rows = []) {
    return [...rows].sort((a, b) => a.displayOrder - b.displayOrder || (a.title || a.clubName).localeCompare(b.title || b.clubName))
  }

  function populateClubFilter(rows = []) {
    const selectedValue = clubFilter?.value || ""
    const clubs = [...new Set(rows
      .filter((item) => item.contactType === "coordinator" && item.clubName)
      .map((item) => item.clubName)
      .sort((a, b) => a.localeCompare(b)))]

    if (clubFilter) {
      clubFilter.innerHTML = `<option value="">All clubs / associations</option>${clubs.map((club) => `<option value="${escapeHtml(club)}">${escapeHtml(club)}</option>`).join("")}`
      clubFilter.value = clubs.includes(selectedValue) ? selectedValue : ""
    }
  }

  function getFilteredContacts() {
    const selectedType = typeFilter?.value || ""
    const selectedClub = clubFilter?.value || ""
    const query = (searchField?.value || "").trim().toLowerCase()

    return contacts.filter((item) => {
      const haystack = [
        item.contactType,
        item.title,
        item.email,
        item.phone,
        item.timing,
        item.address,
        item.clubName,
        item.facultyCoordinator,
        item.facultyCoordinatorEmail,
        item.facultyCoordinatorPhone,
        item.studentCoordinator,
        item.studentCoordinatorClass,
        item.studentCoordinatorEmail,
        item.studentCoordinatorPhone
      ].join(" ").toLowerCase()

      return (!selectedType || item.contactType === selectedType)
        && (!selectedClub || item.clubName === selectedClub)
        && (!query || haystack.includes(query))
    })
  }

  function resetForm() {
    editingId = null
    form.reset()
    $("#displayOrder").value = "0"
    $("#contactType").value = "support"
    $("#studentCoordinatorCount").value = ""
    $("#contactSubmitLabel").textContent = "Save contact"
    $("#cancelContactEdit").classList.add("hidden")
    renderStudentCoordinatorFields(0)
    syncContactTypeUI()
  }

  function renderContactsTable() {
    const rows = getFilteredContacts()

    table.innerHTML = rows.length
      ? rows.map((item) => `
          <tr>
            <td><span class="pill">${item.contactType === "support" ? "Support" : "Coordinator"}</span></td>
            <td>${escapeHtml(item.contactType === "support" ? safeText(item.title) : safeText(item.clubName))}</td>
            <td>${escapeHtml(safeText(item.email))}</td>
            <td class="nowrap-cell">${escapeHtml(safeText(item.phone))}</td>
            <td class="nowrap-cell">${escapeHtml(safeText(item.timing))}</td>
            <td>${formatMultilineHtml(item.address)}</td>
            <td class="nowrap-cell">${formatNoWrapLinesHtml(item.facultyCoordinator)}</td>
            <td class="nowrap-cell">${formatNoWrapLinesHtml(item.facultyCoordinatorEmail)}</td>
            <td class="nowrap-cell">${formatNoWrapLinesHtml(item.facultyCoordinatorPhone)}</td>
            <td class="nowrap-cell">${formatNoWrapLinesHtml(item.studentCoordinator)}</td>
            <td class="nowrap-cell">${formatNoWrapLinesHtml(item.studentCoordinatorClass)}</td>
            <td class="nowrap-cell">${formatNoWrapLinesHtml(item.studentCoordinatorEmail)}</td>
            <td class="nowrap-cell">${formatNoWrapLinesHtml(item.studentCoordinatorPhone)}</td>
            <td>${escapeHtml(String(item.displayOrder))}</td>
            <td>
              <div class="button-row">
                <button class="btn-soft" data-edit="${item.id}">Edit</button>
                <button class="btn-danger" data-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>`).join("")
      : `<tr><td colspan="15">No contacts match the selected filters.</td></tr>`

    $$("[data-edit]", table).forEach((button) => button.addEventListener("click", async () => {
      const { data } = await supabaseClient.from("contacts").select("*").eq("id", button.dataset.edit).single()
      const item = normalizeContact(data)
      editingId = item.id
      $("#contactSubmitLabel").textContent = "Update contact"
      $("#cancelContactEdit").classList.remove("hidden")
      $("#contactType").value = item.contactType
      $("#displayOrder").value = item.displayOrder
      $("#supportTitle").value = item.title
      $("#supportEmail").value = item.email
      $("#supportPhone").value = item.phone || ""
      $("#supportTiming").value = item.timing || ""
      $("#supportAddress").value = item.address || ""
      $("#clubName").value = item.clubName
      $("#facultyCoordinatorName").value = item.facultyCoordinator
      $("#facultyCoordinatorEmail").value = item.facultyCoordinatorEmail || ""
      $("#facultyCoordinatorPhone").value = item.facultyCoordinatorPhone || ""
      const studentNames = splitMultilineValues(item.studentCoordinator)
      const studentClasses = splitMultilineValues(item.studentCoordinatorClass)
      const studentEmails = splitMultilineValues(item.studentCoordinatorEmail)
      const studentPhones = splitMultilineValues(item.studentCoordinatorPhone)
      $("#studentCoordinatorCount").value = studentNames.length || studentClasses.length || studentEmails.length || studentPhones.length || 1
      renderStudentCoordinatorFields(
        studentNames.length || studentClasses.length || studentEmails.length || studentPhones.length || 1,
        studentNames,
        studentClasses,
        studentEmails,
        studentPhones
      )
      syncContactTypeUI()
      window.scrollTo({ top: 0, behavior: "smooth" })
    }))

    $$("[data-delete]", table).forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Delete this contact information?")) return
      const { error } = await supabaseClient.from("contacts").delete().eq("id", button.dataset.delete)
      if (error) return showFlash(flash, "Unable to delete contact. Verify the contacts table exists.", "error")
      showFlash(flash, "Contact deleted successfully.", "success")
      loadContacts()
    }))
  }

  async function loadContacts() {
    contacts = sortContacts((await fetchTable("contacts").catch(() => [])).map(normalizeContact))
    populateClubFilter(contacts)
    renderContactsTable()
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    clearFlash(flash)

    const contactType = typeField?.value || "support"
    const phoneValue = $("#supportPhone").value.trim()
    const timingValue = $("#supportTiming").value.trim()
    const addressValue = $("#supportAddress").value.trim()
    const studentCoordinatorData = getStudentCoordinatorPayload()
    const facultyCoordinatorEmail = $("#facultyCoordinatorEmail").value.trim()
    const facultyCoordinatorPhone = $("#facultyCoordinatorPhone").value.trim()
    const payload = {
      contact_type: contactType,
      title: contactType === "support" ? $("#supportTitle").value.trim() : "",
      email: $("#supportEmail").value.trim(),
      phone: phoneValue,
      timing: contactType === "support" ? timingValue : "",
      address: contactType === "support" ? addressValue : "",
      detail: contactType === "support"
        ? [phoneValue, timingValue, addressValue].filter(Boolean).join(" | ")
        : JSON.stringify({
            facultyCoordinatorEmail,
            facultyCoordinatorPhone,
            studentCoordinatorEmail: studentCoordinatorData.studentCoordinatorEmail,
            studentCoordinatorPhone: studentCoordinatorData.studentCoordinatorPhone
          }),
      club_name: contactType === "coordinator" ? $("#clubName").value.trim() : "",
      faculty_coordinator: contactType === "coordinator" ? $("#facultyCoordinatorName").value.trim() : "",
      student_coordinator: contactType === "coordinator" ? studentCoordinatorData.studentCoordinator : "",
      student_coordinator_class: contactType === "coordinator" ? studentCoordinatorData.studentCoordinatorClass : "",
      display_order: Number($("#displayOrder").value || 0)
    }

    if (contactType === "support" && !payload.title) {
      return showFlash(flash, "Support title is required.", "error")
    }

    if (contactType === "coordinator" && (!payload.club_name || !payload.faculty_coordinator || !studentCoordinatorData.count)) {
      return showFlash(flash, "Club or association, faculty coordinator, and student coordinator count are required.", "error")
    }

    if (contactType === "coordinator" && (!facultyCoordinatorEmail || !facultyCoordinatorPhone)) {
      return showFlash(flash, "Faculty coordinator email and phone number are required.", "error")
    }

    if (contactType === "support" && phoneValue && !isTenDigitPhone(phoneValue)) {
      return showFlash(flash, "Support phone number must be exactly 10 digits.", "error")
    }

    if (contactType === "coordinator" && !isTenDigitPhone(facultyCoordinatorPhone)) {
      return showFlash(flash, "Faculty coordinator phone number must be exactly 10 digits.", "error")
    }

    if (contactType === "coordinator" && studentCoordinatorData.names.some((name) => !name)) {
      return showFlash(flash, "Enter every student coordinator name.", "error")
    }

    if (contactType === "coordinator" && studentCoordinatorData.classes.some((value) => !value)) {
      return showFlash(flash, "Select a class for every student coordinator.", "error")
    }

    if (contactType === "coordinator" && studentCoordinatorData.emails.some((value) => !value)) {
      return showFlash(flash, "Enter an email for every student coordinator.", "error")
    }

    if (contactType === "coordinator" && studentCoordinatorData.phones.some((value) => !value)) {
      return showFlash(flash, "Enter a phone number for every student coordinator.", "error")
    }

    if (contactType === "coordinator" && studentCoordinatorData.phones.some((value) => !isTenDigitPhone(value))) {
      return showFlash(flash, "Every student coordinator phone number must be exactly 10 digits.", "error")
    }

    const action = editingId
      ? supabaseClient.from("contacts").update(payload).eq("id", editingId)
      : supabaseClient.from("contacts").insert([payload])

    const { error } = await action
    if (error) return showFlash(flash, "Unable to save contact. Run the updated schema and verify write access.", "error")

    showFlash(flash, editingId ? "Contact updated successfully." : "Contact created successfully.", "success")
    resetForm()
    loadContacts()
  })

  typeField?.addEventListener("change", syncContactTypeUI)
  $("#studentCoordinatorCount")?.addEventListener("input", (event) => {
    rerenderStudentCoordinatorFieldsPreservingValues(event.target.value)
  })
  typeFilter?.addEventListener("change", renderContactsTable)
  clubFilter?.addEventListener("change", renderContactsTable)
  searchField?.addEventListener("input", renderContactsTable)
  $("#cancelContactEdit")?.addEventListener("click", resetForm)
  downloadButton?.addEventListener("click", () => {
    const filtered = getFilteredContacts()
    const supportContacts = filtered.filter((item) => item.contactType === "support")
    const coordinatorContacts = filtered.filter((item) => item.contactType === "coordinator")

    const buildCoordinatorStack = (item) => {
      const names = splitMultilineValues(item.studentCoordinator)
      const classes = splitMultilineValues(item.studentCoordinatorClass)
      const emails = splitMultilineValues(item.studentCoordinatorEmail)
      const phones = splitMultilineValues(item.studentCoordinatorPhone)
      const rowCount = Math.max(names.length, classes.length, emails.length, phones.length)

      if (!rowCount) return escapeHtml("-")

      return `<div>${Array.from({ length: rowCount }, (_, index) => `
        <div style="margin-bottom:${index === rowCount - 1 ? 0 : 10}px; padding-bottom:${index === rowCount - 1 ? 0 : 10}px; border-bottom:${index === rowCount - 1 ? "0" : "1px solid #e7edf7"};">
          <div><strong>Name:</strong> ${escapeHtml(names[index] || "-")}</div>
          <div><strong>Class:</strong> ${escapeHtml(classes[index] || "-")}</div>
          <div><strong>Email:</strong> ${escapeHtml(emails[index] || "-")}</div>
          <div><strong>Phone:</strong> ${escapeHtml(phones[index] || "-")}</div>
        </div>`).join("")}</div>`
    }

    const buildFacultyContactStack = (item) => {
      return `<div>
        <div><strong>Email:</strong> ${escapeHtml(safeText(item.facultyCoordinatorEmail))}</div>
        <div style="margin-top:4px;"><strong>Phone:</strong> ${escapeHtml(safeText(item.facultyCoordinatorPhone))}</div>
      </div>`
    }

    const buildTimingStack = (item) => {
      const phoneLine = `<div><strong>Phone:</strong> ${escapeHtml(safeText(item.phone))}</div>`
      const timingLine = `<div style="margin-top:4px;"><strong>Timing:</strong> ${escapeHtml(safeText(item.timing))}</div>`
      const addressLine = `<div style="margin-top:4px;"><strong>Address:</strong> ${escapeHtml(safeText(item.address))}</div>`
      return `<div>${phoneLine}${timingLine}${addressLine}</div>`
    }

    downloadReportDoc({
      brandTitle: "Trisha EMS",
      title: "Contact Directory",
      subtitle: "Support contacts and club coordinator directory",
      fileName: "contact-directory-report.pdf",
      orientation: "landscape",
      filters: [
        { label: "Contact Type", value: safeText(typeFilter?.value ? (typeFilter.value === "support" ? "Support" : "Coordinator") : "All") },
        { label: "Club / Association", value: safeText(clubFilter?.value || "All") },
        { label: "Search", value: safeText((searchField?.value || "").trim() || "None") }
      ],
      reportSections: [
        {
          title: "Support Contacts",
          headers: ["S.No", "Title", "Email", "Contact Details"],
          rows: supportContacts.map((item, index) => [
            escapeHtml(index + 1),
            escapeHtml(safeText(item.title)),
            escapeHtml(safeText(item.email)),
            buildTimingStack(item)
          ])
        },
        {
          title: "Club / Association Coordinators",
          headers: ["S.No", "Club / Association", "Faculty Coordinator", "Faculty Contact", "Student Coordinators"],
          rows: coordinatorContacts.map((item, index) => [
            escapeHtml(index + 1),
            escapeHtml(safeText(item.clubName)),
            escapeHtml(safeText(item.facultyCoordinator)),
            buildFacultyContactStack(item),
            buildCoordinatorStack(item)
          ])
        }
      ]
    })
  })

  resetForm()
  await loadContacts()
}

async function initViewRegistrations() {
  requireRole("admin"); initNav()
  const [registrationsData, competitionsData] = await Promise.all([fetchTable("registrations").catch(() => []), fetchTable("competitions").catch(() => [])])
  const registrations = registrationsData.map(normalizeRegistration)
  const competitionMap = Object.fromEntries(competitionsData.map((item) => { const c = normalizeCompetition(item); return [c.id, c.theme] }))
  $("#registrationBody").innerHTML = registrations.length ? registrations.map((item) => `<tr><td>${item.student_name}</td><td>${item.register_number}</td><td>${safeText(item.department)}</td><td>${safeText(item.semester)}</td><td>${safeText(item.email)}</td><td>${safeText(item.contact_number)}</td><td>${safeText(competitionMap[item.competition_id])}</td><td><span class="status-chip open">${safeText(item.status, "Registered")}</span></td></tr>`).join("") : `<tr><td colspan="8">No registrations found.</td></tr>`
}

async function initAdminCatalog() {
  requireAnyRole("admin", "coordinator"); initNav()
  const session = getSession()
  const isCoordinator = isCoordinatorSession(session)
  const coordinatorClub = getSessionClub(session)
  const optionSettings = await fetchOptionSettingsWithFallback()
  const [eventsData, competitionsData] = await Promise.all([
    fetchTable("events").catch(() => []),
    fetchTable("competitions").catch(() => [])
  ])

  const items = [
    ...eventsData.map((item) => {
      const event = normalizeEvent(item)
      return {
        type: "Event",
        name: event.theme,
        date: event.date,
        endDate: event.endDate,
        time: event.time,
        club: event.club,
        category: event.category,
        venue: event.venue,
        raw: event
      }
    }),
    ...competitionsData.map((item) => {
      const competition = normalizeCompetition(item)
      return {
        type: "Competition",
        name: competition.theme,
        date: competition.competitionDate,
        endDate: competition.competitionEndDate,
        time: competition.time,
        club: competition.club,
        category: competition.category,
        venue: competition.venue,
        raw: competition
      }
    })
  ]
    .filter((item) => !isCoordinator || itemBelongsToClub(item.club, coordinatorClub))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))

  const body = $("#activityBody")
  const search = $("#activitySearch")
  const dateFilter = $("#activityDateFilter")
  const typeFilter = $("#activityTypeFilter")
  const clubFilter = $("#activityClubFilter")
  const categoryFilter = $("#activityCategoryFilter")
  const statusFilter = $("#activityStatusFilter")
  const getSelectedActivityClub = () => isCoordinator ? coordinatorClub : (clubFilter?.value || "")
  if (clubFilter) {
    if (isCoordinator && coordinatorClub) {
      clubFilter.innerHTML = `<option value="${escapeHtml(coordinatorClub)}">${escapeHtml(coordinatorClub)}</option>`
      clubFilter.value = coordinatorClub
      clubFilter.disabled = true
    } else {
      clubFilter.innerHTML = renderSelectOptions(getOptionItems(optionSettings, "clubs"), "All clubs")
    }
  }
  if (categoryFilter) {
    categoryFilter.innerHTML = renderSelectOptions(getOptionItems(optionSettings, "categories"), "All categories")
  }

  function getStatus(value, endValue = "", timeValue = "") {
    const startDate = parseDateInput(value)
    if (!startDate) return "Completed"

    const cutoff = getEventCutoff(value, timeValue, endValue)
    if (cutoff && new Date() > cutoff) return "Completed"

    const today = todayISO()
    if (endValue && value < today && today <= endValue) return "Today"
    if (value === today) return "Today"
    if (value > today) return "Upcoming"
    return "Completed"
  }

  function getFilteredItems() {
    const query = (search?.value || "").trim().toLowerCase()
    const selectedDate = dateFilter?.value || ""
    const selectedType = typeFilter?.value || ""
    const selectedClub = getSelectedActivityClub()
    const selectedCategory = categoryFilter?.value || ""
    const selectedStatus = statusFilter?.value || ""

    return items.filter((item) => {
      const text = `${item.name} ${item.club || ""} ${item.category || ""} ${item.venue || ""}`.toLowerCase()
      const status = getStatus(item.date, item.endDate, item.time)
      return (!query || text.includes(query))
        && dateMatchesRange(selectedDate, item.date, item.endDate)
        && (!selectedType || item.type === selectedType)
        && (!selectedClub || itemBelongsToClub(item.club, selectedClub))
        && (!selectedCategory || (item.category || "").toLowerCase() === selectedCategory.toLowerCase())
        && (!selectedStatus || status === selectedStatus)
    })
  }

  function renderCatalog() {
    const filtered = getFilteredItems()

    body.innerHTML = filtered.length
      ? filtered.map((item, index) => {
          const status = getStatus(item.date, item.endDate, item.time)
          const chipClass = status === "Completed" ? "closed" : "open"
          return `<tr><td>${index + 1}</td><td>${item.type}</td><td>${item.name}</td><td>${formatDateRange(item.date, item.endDate)}</td><td>${safeText(item.club)}</td><td>${safeText(item.category)}</td><td>${safeText(item.venue)}</td><td><span class="status-chip ${chipClass}">${status}</span></td></tr>`
        }).join("")
      : `<tr><td colspan="8">No items match the selected filters.</td></tr>`
  }

  ;[search, dateFilter, typeFilter, clubFilter, categoryFilter, statusFilter].forEach((element) => {
    element?.addEventListener("input", renderCatalog)
    element?.addEventListener("change", renderCatalog)
  })

  renderCatalog()

  $("#downloadActivitiesPdf")?.addEventListener("click", () => {
    const filtered = getFilteredItems()
    const headers = ["S.No", "Type", "Activity Name", "Date", "Club / Department", "Category", "Venue", "Status"]
    downloadReportDoc({
      brandTitle: "Trisha EMS",
      title: "Activities List",
      subtitle: "Filtered activity list prepared for submission",
      fileName: "college-activities-report.pdf",
      orientation: "landscape",
      tableClassName: "report-table-compact",
      tableHeaders: headers,
      tableRows: filtered.map((item, index) => [
        escapeHtml(index + 1),
        escapeHtml(item.type),
        escapeHtml(item.name),
        escapeHtml(formatDateRange(item.date, item.endDate)).replace(/ /g, "&nbsp;"),
        escapeHtml(safeText(item.club)),
        escapeHtml(safeText(item.category)),
        escapeHtml(safeText(item.venue)),
        escapeHtml(getStatus(item.date, item.endDate, item.time))
      ])
    })
  })
}

async function initReportGenerator() {
  requireAnyRole("admin", "coordinator"); initNav()
  const session = getSession()
  const isCoordinator = isCoordinatorSession(session)
  const coordinatorClub = getSessionClub(session)
  const [competitionsData, registrationsData] = await Promise.all([fetchTable("competitions").catch(() => []), fetchTable("registrations").catch(() => [])])
  const competitions = competitionsData
    .map(normalizeCompetition)
    .filter((item) => !isCoordinator || itemBelongsToClub(item.club, coordinatorClub))
  const registrations = registrationsData.map(normalizeRegistration)
  const dropdown = $("#competitionDropdown")
  const clubFilter = $("#participantClubFilter")
  const optionSettings = await fetchOptionSettingsWithFallback()
  dropdown.innerHTML = `<option value="">Select competition</option>${competitions.map((item) => `<option value="${item.id}">${item.theme}</option>`).join("")}`
  const getSelectedParticipantClub = () => isCoordinator ? coordinatorClub : (clubFilter?.value || "")
  if (clubFilter) {
    if (isCoordinator && coordinatorClub) {
      clubFilter.innerHTML = `<option value="${escapeHtml(coordinatorClub)}">${escapeHtml(coordinatorClub)}</option>`
      clubFilter.value = coordinatorClub
      clubFilter.disabled = true
    } else {
      clubFilter.innerHTML = renderSelectOptions(getOptionItems(optionSettings, "clubs"), "All clubs")
    }
  }
  const search = $("#participantSearch")
  const departmentFilter = $("#participantDepartmentFilter")
  const semesterFilter = $("#participantSemesterFilter")

  function getSelectedCompetition() {
    return competitions.find((item) => item.id === dropdown.value) || null
  }

  function getVisibleCompetitions() {
    const selectedClub = getSelectedParticipantClub()
    return competitions.filter((item) => !selectedClub || itemBelongsToClub(item.club, selectedClub))
  }

  function syncCompetitionOptions() {
    const selectedValue = dropdown?.value || ""
    const visibleCompetitions = getVisibleCompetitions()
    dropdown.innerHTML = `<option value="">Select competition</option>${visibleCompetitions.map((item) => `<option value="${item.id}">${item.theme}</option>`).join("")}`
    dropdown.value = visibleCompetitions.some((item) => item.id === selectedValue) ? selectedValue : ""
  }

  function getFilteredParticipants() {
    const query = (search?.value || "").trim().toLowerCase()
    const selectedDepartment = departmentFilter?.value || ""
    const selectedSemester = semesterFilter?.value || ""
    const selectedClub = getSelectedParticipantClub()
    return registrations.filter((item) => {
      const membersText = item.team_members?.length
        ? item.team_members.map((m) => `${m.name} ${m.usn}`).join(" ")
        : `${item.student_name} ${item.register_number}`
      const haystack = `${membersText} ${item.department || ""} ${item.semester || ""} ${item.email || ""}`.toLowerCase()
      const competition = competitions.find((entry) => entry.id === item.competition_id)
      return (!dropdown.value || item.competition_id === dropdown.value)
        && (!selectedClub || itemBelongsToClub(competition?.club, selectedClub))
        && (!query || haystack.includes(query))
        && (!selectedDepartment || item.department === selectedDepartment)
        && (!selectedSemester || item.semester === selectedSemester)
    })
  }

  function renderParticipants() {
    const hasActiveFilter = Boolean(
      getSelectedParticipantClub()
      || (dropdown?.value || "")
      || (search?.value || "").trim()
      || (departmentFilter?.value || "")
      || (semesterFilter?.value || "")
    )

    if (!hasActiveFilter) {
      $("#participantReport").innerHTML = `<tr><td colspan="6">Select a filter to view participant data.</td></tr>`
      return
    }

    const filtered = getFilteredParticipants()
    $("#participantReport").innerHTML = filtered.length ? filtered.map((item) => {
      const participants = getRegistrationParticipants(item)
      const members = participants.map((participant) => participant.name).join("<br>")
      const registerNumbers = participants.map((participant) => participant.usn).join("<br>")
      return `<tr><td>${members}</td><td>${registerNumbers}</td><td>${safeText(item.department)}</td><td>${safeText(item.semester)}</td><td>${safeText(item.email)}</td><td>${safeText(item.contact_number)}</td></tr>`
    }).join("") : `<tr><td colspan="6">No participants found for this filter.</td></tr>`
  }

  clubFilter?.addEventListener("change", () => {
    syncCompetitionOptions()
    renderParticipants()
  })

  ;[dropdown, search, departmentFilter, semesterFilter].forEach((element) => {
    element?.addEventListener("change", renderParticipants)
    element?.addEventListener("input", renderParticipants)
  })
  syncCompetitionOptions()
  renderParticipants()
  $$(".download-report").forEach((button) => button.addEventListener("click", () => {
    const selectedCompetition = getSelectedCompetition()
    const hasActiveFilter = Boolean(
      getSelectedParticipantClub()
      || (dropdown?.value || "")
      || (search?.value || "").trim()
      || (departmentFilter?.value || "")
      || (semesterFilter?.value || "")
    )
    if (!hasActiveFilter) return
    const filtered = getFilteredParticipants()
    downloadReportDoc({
      brandTitle: "Trisha EMS",
      title: "Participant List",
      subtitle: selectedCompetition
        ? `${selectedCompetition.theme} - ${formatDateRange(selectedCompetition.competitionDate, selectedCompetition.competitionEndDate)}`
        : "Competition registration details",
      fileName: "participant-list-report.pdf",
      orientation: "portrait",
      competitionMeta: selectedCompetition ? [
        { label: "Competition Name", value: selectedCompetition.theme },
        { label: "Type", value: selectedCompetition.competition_type === "Group" ? `Group (${selectedCompetition.minTeamLimit || 0}-${selectedCompetition.maxTeamLimit || 0})` : selectedCompetition.competition_type },
        { label: "Date", value: formatDateRange(selectedCompetition.competitionDate, selectedCompetition.competitionEndDate) },
        { label: "Time", value: formatTime(selectedCompetition.time) },
        { label: "Venue", value: safeText(selectedCompetition.venue) },
        { label: "Category", value: safeText(selectedCompetition.category) }
      ] : [],
      tableHeaders: ["S.No", "Participants", "Register Numbers", "Department", "Year / Semester", "Email", "Contact"],
      tableRows: filtered.map((item, index) => {
        const members = getRegistrationParticipants(item)
        return [
          escapeHtml(index + 1),
          `<span class="report-stack">${members.map((member) => escapeHtml(member.name || "-")).join("<br>")}</span>`,
          `<span class="report-stack">${members.map((member) => escapeHtml(member.usn || "-")).join("<br>")}</span>`,
          escapeHtml(safeText(item.department)),
          escapeHtml(safeText(item.semester)),
          escapeHtml(safeText(item.email)),
          escapeHtml(safeText(item.contact_number))
        ]
      })
    })
  }))
}

async function initSummaryReport() {
  requireAnyRole("admin", "coordinator"); initNav()
  const session = getSession()
  const isCoordinator = isCoordinatorSession(session)
  const coordinatorClub = getSessionClub(session)
  const typeSelect = $("#typeSelect"), itemSelect = $("#itemSelect"), preview = $("#summaryPreview")
  const clubFilter = $("#summaryClubFilter")
  const optionSettings = await fetchOptionSettingsWithFallback()
  let currentSummary = null
  const getSelectedSummaryClub = () => isCoordinator ? coordinatorClub : (clubFilter?.value || "")
  if (clubFilter) {
    if (isCoordinator && coordinatorClub) {
      clubFilter.innerHTML = `<option value="${escapeHtml(coordinatorClub)}">${escapeHtml(coordinatorClub)}</option>`
      clubFilter.value = coordinatorClub
      clubFilter.disabled = true
    } else {
      clubFilter.innerHTML = renderSelectOptions(getOptionItems(optionSettings, "clubs"), "All clubs")
    }
  }
  async function loadOptions() {
    itemSelect.innerHTML = `<option value="">Select item</option>`
    if (!typeSelect.value) return
    const rows = await fetchTable(typeSelect.value === "event" ? "events" : "competitions").catch(() => [])
    const normalized = rows
      .map(typeSelect.value === "event" ? normalizeEvent : normalizeCompetition)
      .filter((item) => {
        const selectedClub = getSelectedSummaryClub()
        return !selectedClub || itemBelongsToClub(item.club, selectedClub)
      })
    itemSelect.innerHTML += normalized.map((item) => `<option value="${item.id}">${item.theme}</option>`).join("")
  }
  async function generatePreview() {
    if (!typeSelect.value || !itemSelect.value) {
      currentSummary = null
      return preview.innerHTML = renderEmpty("Select a type and item to generate the summary report.")
    }
    const table = typeSelect.value === "event" ? "events" : "competitions"
    const { data } = await supabaseClient.from(table).select("*").eq("id", itemSelect.value).single()
    const registrations = (await fetchTable("registrations").catch(() => [])).map(normalizeRegistration)
    if (typeSelect.value === "event") {
      const item = normalizeEvent(data)
      if (isCoordinator && !itemBelongsToClub(item.club, coordinatorClub)) {
        currentSummary = null
        return preview.innerHTML = renderEmpty("This summary is not available for your club.")
      }
      currentSummary = {
        type: "event",
        item,
        participantCount: 0
      }
      preview.innerHTML = buildSummaryReportMarkup(currentSummary)
    } else {
      const item = normalizeCompetition(data)
      if (isCoordinator && !itemBelongsToClub(item.club, coordinatorClub)) {
        currentSummary = null
        return preview.innerHTML = renderEmpty("This summary is not available for your club.")
      }
      const participantCount = registrations.filter((row) => row.competition_id === itemSelect.value).length
      currentSummary = {
        type: "competition",
        item,
        participantCount
      }
      preview.innerHTML = buildSummaryReportMarkup(currentSummary)
    }
  }
  typeSelect.addEventListener("change", async () => { await loadOptions(); await generatePreview() })
  clubFilter?.addEventListener("change", async () => { await loadOptions(); await generatePreview() })
  itemSelect.addEventListener("change", generatePreview)
  $("#summaryDownload").addEventListener("click", () => {
    if (!currentSummary) return
    const fileLabel = currentSummary.item?.theme ? `${currentSummary.item.theme.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-summary-report.pdf` : "summary-report.pdf"
    downloadHtmlDoc(fileLabel, buildSummaryReportMarkup(currentSummary), "portrait")
  })
  preview.innerHTML = renderEmpty("Select a type and item to generate the summary report.")
}

async function initManageUsers() {
  requireRole("admin")
  initNav()

  const accountForm = $("#accountForm")
  const accountFlash = $("#accountFlash")
  const accountTable = $("#accountTable")
  const accountRole = $("#accountRole")
  const accountClubField = $("#accountClubField")
  const accountClub = $("#accountClub")
  const accountFilterRole = $("#accountFilterRole")
  let editingAccountId = ""

  function syncAccountRoleUI() {
    const isCoordinator = accountRole?.value === "coordinator"
    accountClubField?.classList.toggle("hidden", !isCoordinator)
    if (accountClub) accountClub.required = isCoordinator
    if (!isCoordinator && accountClub) accountClub.value = ""
  }

  function populateClubField(selectedClub = "") {
    if (accountClub) accountClub.value = selectedClub
  }

  function resetAccountForm() {
    editingAccountId = ""
    accountForm?.reset()
    $("#accountSubmitLabel").textContent = "Save account"
    $("#cancelAccountEdit")?.classList.add("hidden")
    syncAccountRoleUI()
  }


  async function loadAccounts() {
    return await fetchLoginUsers()
  }

  async function renderAccounts() {
    const rows = await loadAccounts()
    populateClubField(accountClub?.value || "")
    const selectedRole = accountFilterRole?.value || ""
    const visibleRows = rows.filter((item) => !selectedRole || item.role === selectedRole)
    accountTable.innerHTML = visibleRows.length
      ? visibleRows.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.role)}</td><td>${escapeHtml(safeText(item.club))}</td><td>${escapeHtml(item.displayName)}</td><td>${escapeHtml(item.username)}</td><td>${escapeHtml(item.password)}</td><td>${item.active ? "Active" : "Inactive"}</td><td><div class="button-row"><button class="btn-soft" type="button" data-account-edit="${item.id}">Edit</button><button class="btn-danger" type="button" data-account-delete="${item.id}">Delete</button></div></td></tr>`).join("")
      : `<tr><td colspan="8">No login accounts available for this filter.</td></tr>`

    $$("[data-account-edit]", accountTable).forEach((button) => button.addEventListener("click", async () => {
      const item = rows.find((entry) => entry.id === button.dataset.accountEdit)
      if (!item) return
      editingAccountId = item.id
      $("#accountName").value = item.displayName
      $("#accountRole").value = item.role
      populateClubField(item.club)
      syncAccountRoleUI()
      $("#accountUsername").value = item.username
      $("#accountPassword").value = item.password
      $("#accountActive").checked = item.active
      $("#accountSubmitLabel").textContent = "Update account"
      $("#cancelAccountEdit")?.classList.remove("hidden")
      window.scrollTo({ top: 0, behavior: "smooth" })
    }))

    $$("[data-account-delete]", accountTable).forEach((button) => button.addEventListener("click", async () => {
      if (!window.confirm("Delete this login account?")) return
      clearFlash(accountFlash)
      try {
        await runLoginUserQuery("delete", null, "id", button.dataset.accountDelete)
      } catch {
        return showFlash(accountFlash, "Unable to delete account.", "error")
      }
      showFlash(accountFlash, "Login account deleted.", "success")
      await renderAccounts()
    }))
  }

  accountForm?.addEventListener("submit", async (event) => {
    event.preventDefault()
    clearFlash(accountFlash)
    const isEditing = Boolean(editingAccountId)
    const role = accountRole?.value || ""
    const club = accountClub?.value || ""
    const payload = {
      display_name: $("#accountName").value.trim(),
      role,
      club: role === "coordinator" ? club.trim() : "",
      username: $("#accountUsername").value.trim(),
      password: $("#accountPassword").value.trim(),
      active: $("#accountActive").checked
    }
    if (!payload.display_name || !payload.role || !payload.username || !payload.password) {
      return showFlash(accountFlash, "Name, role, username, and password are required.", "error")
    }
    if (payload.role === "coordinator" && !payload.club) {
      return showFlash(accountFlash, "Enter the coordinator club or association.", "error")
    }

    try {
      if (editingAccountId) {
        await runLoginUserQuery("update", payload, "id", editingAccountId)
      } else {
        await runLoginUserQuery("insert", payload)
      }
    } catch (error) {
      return showFlash(accountFlash, error.message ? `Unable to save login account: ${error.message}` : "Unable to save login account.", "error")
    }
    showFlash(accountFlash, isEditing ? "Login account updated." : "Login account created.", "success")
    resetAccountForm()
    await renderAccounts()
  })

  accountRole?.addEventListener("change", syncAccountRoleUI)
  accountFilterRole?.addEventListener("change", renderAccounts)
  $("#cancelAccountEdit")?.addEventListener("click", resetAccountForm)

  populateClubField()
  syncAccountRoleUI()
  await renderAccounts()
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient && page !== "login") return console.error("Supabase client failed to initialize.")
  const initializers = {
    login: initLoginPage,
    studentDashboard: initStudentDashboard,
    events: initEventsPage,
    eventDetails: initEventDetails,
    competitionDetails: initCompetitionDetails,
    registration: initRegistrationPage,
    contact: initContactPage,
    adminDashboard: initAdminDashboard,
    manageOptions: initManageOptions,
    manageEvents: initManageEvents,
    manageCompetitions: initManageCompetitions,
    manageContacts: initManageContacts,
    manageHighlights: initManageHighlights,
    manageUsers: initManageUsers,
    viewRegistrations: initViewRegistrations,
    adminCatalog: initAdminCatalog,
    reportGenerator: initReportGenerator,
    summaryReport: initSummaryReport
  }
  const initializer = initializers[page]
  if (!initializer) return
  try { await initializer() } catch (error) {
    console.error(error)
    showFlash(document.querySelector(".flash"), error.message || "Something went wrong while loading the page.", "error")
  }
})
