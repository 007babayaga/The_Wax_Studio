import React, { useState, useEffect, useRef } from "react";
import { GoogleLogin } from "@react-oauth/google";
import AnalyticsDashboard from "./adminDashboard/AnalyticsDashboard";

const API_BASE = "http://localhost:5400/api/v1";

const ENDPOINTS = {
  sendOtp: API_BASE + "/otp/toEmail",
  resendOtp: API_BASE + "/otp/resendOtpToEmail",
  verifyOtp: API_BASE + "/otp/verifyEmailOtp",
  signUp: API_BASE + "/auth/signUp",
  login: API_BASE + "/auth/userLogin",
  logout: API_BASE + "/auth/userLogout",
  googleAuth: API_BASE + "/auth/google",
  adminProducts: API_BASE + "/admin/addProduct", // POST add product
  adminProduct: (id) => API_BASE + "/admin/editProduct/" + id, // PUT, DELETE
  adminInventory: API_BASE + "/admin/getProducts" // GET ?search=
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,12}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const RESEND_SECONDS = 30;

async function apiCall(url, method = "GET", body = null, isFormData = false) {
  const opts = { method, credentials: "include", headers: {} };
  if (body !== null) {
    if (isFormData) {
      opts.body = body;
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, opts);
  let data;
  try {
    data = await res.json();
  } catch {
    data = { isSuccess: false, message: "Non-JSON response (status " + res.status + ")" };
  }
  return { ok: res.ok, status: res.status, data };
}

// kept for the existing signup/otp/login flow — thin wrapper over apiCall
async function callApi(url, body) {
  return apiCall(url, "POST", body);
}

function Toast({ toast }) {
  if (!toast.visible) return null;
  const bg = toast.type === "error" ? "#B23A2E" : toast.type === "success" ? "#3E6E4C" : "#2A2118";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: bg,
        color: "#fff",
        padding: "10px 18px",
        borderRadius: 4,
        fontSize: 13,
        whiteSpace: "nowrap",
        zIndex: 1000
      }}
    >
      {toast.message}
    </div>
  );
}

const App = () => {
  const [step, setStep] = useState("details");
  const [currentUser, setCurrentUser] = useState(null); // { id, name, email, role }

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [errors, setErrors] = useState({});
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const timerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });
  const toastTimeoutRef = useRef(null);

  // ---- Admin panel state ----
  const [products, setProducts] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    scent: "",
    price: "",
    stock: ""
  });

  function showToast(message, type = "") {
    setToast({ visible: true, message, type });
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 2400);
  }

  function startResendTimer() {
    clearInterval(timerRef.current);
    setSecondsLeft(RESEND_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return m + ":" + sec;
  }

  async function handleVerifyClick() {
    const newErrors = {
      name: !name.trim(),
      dob: !dob,
      email: !EMAIL_REGEX.test(email.trim())
    };
    setErrors(newErrors);
    if (newErrors.name || newErrors.dob || newErrors.email) return;

    setLoading(true);
    try {
      const { ok, data } = await callApi(ENDPOINTS.sendOtp, {
        email: email.trim(),
        name: name.trim(),
        dateOfBirth: dob
      });
      if (ok && data.isSuccess) {
        setOtpDigits(["", "", "", "", ""]);
        setStep("otp");
        startResendTimer();
        showToast(data.message || "OTP sent to " + email, "success");
        setTimeout(() => otpRefs.current[0] && otpRefs.current[0].focus(), 0);
      } else {
        showToast(data.message || "Failed to send OTP", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendClick() {
    if (secondsLeft > 0 || loading) return;
    setLoading(true);
    try {
      const { ok, data } = await callApi(ENDPOINTS.resendOtp, {
        email: email.trim(),
        name: name.trim(),
        dateOfBirth: dob
      });
      if (ok && data.isSuccess) {
        setOtpDigits(["", "", "", "", ""]);
        setErrors((e) => ({ ...e, otp: null }));
        startResendTimer();
        showToast(data.message || "New OTP sent", "success");
        setTimeout(() => otpRefs.current[0] && otpRefs.current[0].focus(), 0);
      } else {
        showToast(data.message || "Failed to resend OTP", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(i, value) {
    const digit = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otpDigits];
    next[i] = digit;
    setOtpDigits(next);
    if (digit && i < otpDigits.length - 1) {
      otpRefs.current[i + 1] && otpRefs.current[i + 1].focus();
    }
  }

  function handleOtpKeyDown(i, e) {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1] && otpRefs.current[i - 1].focus();
    }
  }

  async function handleVerifyOtpClick() {
    const entered = otpDigits.join("");
    if (entered.length < 5) {
      setErrors((e) => ({ ...e, otp: "Enter all 5 digits." }));
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await callApi(ENDPOINTS.verifyOtp, {
        email: email.trim(),
        otp: entered
      });
      if (ok && data.isSuccess) {
        setErrors((e) => ({ ...e, otp: null }));
        clearInterval(timerRef.current);
        setStep("password");
        showToast(data.message || "Email verified", "success");
      } else {
        setErrors((e) => ({ ...e, otp: data.message || "Incorrect code. Try again." }));
        setOtpDigits(["", "", "", "", ""]);
        otpRefs.current[0] && otpRefs.current[0].focus();
      }
    } catch (err) {
      setErrors((e) => ({ ...e, otp: "Network error: " + err.message }));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignupClick() {
    if (!PASSWORD_REGEX.test(password)) {
      setErrors((e) => ({ ...e, password: true }));
      return;
    }
    setErrors((e) => ({ ...e, password: false }));
    setLoading(true);
    try {
      const { ok, data } = await callApi(ENDPOINTS.signUp, {
        name: name.trim(),
        dateOfBirth: dob,
        email: email.trim(),
        password
      });
      if (ok && data.isSuccess) {
        setCurrentUser(data.user || { name: name.trim(), email: email.trim(), role: "user" });
        setStep("success");
        showToast(data.message || "Account created", "success");
      } else {
        showToast(data.message || "Signup failed", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginClick() {
    if (!EMAIL_REGEX.test(loginEmail.trim())) {
      setErrors((e) => ({ ...e, login: "Enter a valid email address." }));
      return;
    }
    if (!loginPassword.trim()) {
      setErrors((e) => ({ ...e, login: "Password is required." }));
      return;
    }
    setErrors((e) => ({ ...e, login: null }));
    setLoading(true);
    try {
      const { ok, data } = await callApi(ENDPOINTS.login, {
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword
      });
      if (ok && data.isSuccess) {
        setName(data.user?.name || "");
        setCurrentUser(data.user || null);
        setStep("success");
        showToast(data.message || "Login successful", "success");
      } else {
        showToast(data.message || "Login failed", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoutClick() {
    setLoading(true);
    try {
      const { ok, data } = await apiCall(ENDPOINTS.logout, "POST");
      if (ok && data.isSuccess) {
        showToast(data.message || "Logged out successfully", "success");
        resetAll();
      } else {
        showToast(data.message || "Logout failed", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setLoading(true);
    try {
      const { ok, data } = await callApi(ENDPOINTS.googleAuth, {
        idToken: credentialResponse.credential
      });
      if (ok && data.isSuccess) {
        if (data.user && data.user.name) setName(data.user.name);
        setCurrentUser(data.user || null);
        setStep("success");
        showToast(data.message || "Signed in with Google", "success");
      } else {
        showToast(data.message || "Google sign-in failed", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  // ---- Admin panel handlers ----

  async function fetchProducts(searchTerm) {
    setProductLoading(true);
    try {
      const url = ENDPOINTS.adminInventory + (searchTerm ? "?search=" + encodeURIComponent(searchTerm) : "");
      const { ok, data } = await apiCall(url, "GET");
      if (ok && data.isSuccess) {
        setProducts(data.products || []);
      } else {
        showToast(data.message || "Failed to load inventory", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setProductLoading(false);
    }
  }

  useEffect(() => {
    if (step !== "admin") return;
    const handle = setTimeout(() => fetchProducts(inventorySearch), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, inventorySearch]);

  function openAddProduct() {
    setEditingProductId(null);
    setProductForm({
      name: "",
      description: "",
      category: "",
      sku: "",
      scent: "",
      burnTime: "",
      waxType: "",
      weight: "",
      color: "",
      tags: "",
      offerPrice: "",
      price: "",
      stock: "",
      variants: "",
      metaData: "",
      imageFile: null
    });
    setShowProductForm(true);
  }

  function openEditProduct(p) {
    setEditingProductId(p._id);
    setProductForm({
      name: p.name || "",
      description: p.description || "",
      category: p.category || "",
      sku: p.sku || "",
      scent: p.scent || "",
      burnTime: p.burnTime != null ? String(p.burnTime) : "",
      waxType: p.waxType || "",
      weight: p.weight != null ? String(p.weight) : "",
      color: p.color || "",
      tags: Array.isArray(p.tags) ? p.tags.join(",") : "",
      offerPrice: p.offerPrice != null ? String(p.offerPrice) : "",
      price: p.price != null ? String(p.price) : "",
      stock: p.stock != null ? String(p.stock) : "",
      variants: Array.isArray(p.variants) ? JSON.stringify(p.variants) : "",
      metaData: p.metaData ? JSON.stringify(p.metaData) : "",
      imageFile: null
    });
    setShowProductForm(true);
  }

  async function handleSaveProduct() {
    if (!productForm.name.trim() || !productForm.price || !productForm.category || !productForm.sku || !productForm.scent || !productForm.waxType || !productForm.weight || !productForm.imageFile) {
      showToast("Name, price, category, SKU, scent, waxType, weight, and image are required", "error");
      return;
    }

    const body = new FormData();
    body.append("name", productForm.name.trim());
    body.append("description", productForm.description.trim());
    body.append("category", productForm.category.trim());
    body.append("sku", productForm.sku.trim().toUpperCase());
    body.append("scent", productForm.scent.trim());
    body.append("burnTime", productForm.burnTime ? Number(productForm.burnTime) : 0);
    body.append("waxType", productForm.waxType.trim());
    body.append("weight", Number(productForm.weight));
    body.append("color", productForm.color.trim() || "white");
    body.append("tags", productForm.tags.trim());
    body.append("price", Number(productForm.price));
    body.append("offerPrice", productForm.offerPrice ? Number(productForm.offerPrice) : 0);
    body.append("stock", Number(productForm.stock || 0));
    body.append("variants", productForm.variants ? productForm.variants : "[]");
    body.append("metaData", productForm.metaData ? productForm.metaData : "{}");
    body.append("image", productForm.imageFile);

    setProductLoading(true);
    try {
      const { ok, data } = editingProductId
        ? await apiCall(ENDPOINTS.adminProduct(editingProductId), "PUT", body, true)
        : await apiCall(ENDPOINTS.adminProducts, "POST", body, true);

      if (ok && data.isSuccess) {
        showToast(data.message || (editingProductId ? "Product updated" : "Product created"), "success");
        setShowProductForm(false);
        fetchProducts(inventorySearch);
      } else {
        showToast(data.message || "Save failed", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setProductLoading(false);
    }
  }

  async function handleDeleteProduct(id) {
    setProductLoading(true);
    try {
      const { ok, data } = await apiCall(ENDPOINTS.adminProduct(id), "DELETE");
      if (ok && data.isSuccess) {
        showToast(data.message || "Product deleted", "success");
        fetchProducts(inventorySearch);
      } else {
        showToast(data.message || "Delete failed", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setProductLoading(false);
    }
  }

  async function handleActivateProduct(id) {
    setProductLoading(true);
    try {
      const { ok, data } = await apiCall(ENDPOINTS.adminProduct(id), "PUT", { isActive: true });
      if (ok && data.isSuccess) {
        showToast(data.message || "Product activated", "success");
        fetchProducts(inventorySearch);
      } else {
        showToast(data.message || "Activation failed", "error");
      }
    } catch (err) {
      showToast("Network error: " + err.message, "error");
    } finally {
      setProductLoading(false);
    }
  }

  function resetAll() {
    setName("");
    setDob("");
    setEmail("");
    setPassword("");
    setLoginEmail("");
    setLoginPassword("");
    setOtpDigits(["", "", "", "", ""]);
    setErrors({});
    setCurrentUser(null);
    setProducts([]);
    setInventorySearch("");
    clearInterval(timerRef.current);
    setStep("details");
  }

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#1c1712",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      fontFamily: "'Inter', sans-serif"
    },
    card: {
      width: 420,
      maxWidth: "100%",
      background: "#F4EFE6",
      borderRadius: 6,
      overflow: "hidden",
      boxShadow: "0 30px 60px rgba(0,0,0,.35)"
    },
    cardWide: {
      width: 720,
      maxWidth: "100%",
      background: "#F4EFE6",
      borderRadius: 6,
      overflow: "hidden",
      boxShadow: "0 30px 60px rgba(0,0,0,.35)"
    },
    brand: { padding: "28px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    brandText: {
      fontFamily: "'Playfair Display', serif",
      fontWeight: 600,
      fontSize: 15,
      color: "#2A2118",
      letterSpacing: ".03em"
    },
    panel: { padding: "20px 32px 32px" },
    h1: {
      fontFamily: "'Playfair Display', serif",
      fontWeight: 600,
      fontSize: 26,
      color: "#2A2118",
      margin: "8px 0 4px"
    },
    h1Small: { fontSize: 22 },
    sub: { fontSize: 13, color: "#6B5E4F", margin: "0 0 24px", lineHeight: 1.5 },
    field: { marginBottom: 16 },
    label: { display: "block", fontSize: 12, color: "#6B5E4F", marginBottom: 6 },
    input: {
      width: "100%",
      padding: "11px 13px",
      border: "1px solid #DED4C1",
      borderRadius: 4,
      background: "#fff",
      fontSize: 14,
      color: "#2A2118",
      fontFamily: "'Inter', sans-serif",
      outline: "none",
      boxSizing: "border-box"
    },
    err: { fontSize: 12, color: "#B23A2E", marginTop: 6 },
    hint: { fontSize: 11, color: "#6B5E4F", marginTop: 6 },
    btnPrimary: {
      width: "100%",
      padding: 12,
      background: "#6E2A2E",
      color: "#fff",
      border: "none",
      borderRadius: 4,
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      letterSpacing: ".02em",
      marginTop: 6
    },
    btnSmall: {
      padding: "7px 12px",
      background: "#6E2A2E",
      color: "#fff",
      border: "none",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer"
    },
    btnSmallOutline: {
      padding: "7px 12px",
      background: "#fff",
      color: "#6E2A2E",
      border: "1px solid #6E2A2E",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer"
    },
    btnSmallDanger: {
      padding: "7px 12px",
      background: "#fff",
      color: "#B23A2E",
      border: "1px solid #B23A2E",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer"
    },
    btnLink: {
      background: "none",
      border: "none",
      color: "#6E2A2E",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      padding: 0
    },
    footRow: { textAlign: "center", marginTop: 18, fontSize: 13, color: "#6B5E4F" },
    otpRow: { display: "flex", gap: 10, justifyContent: "center", margin: "6px 0 20px" },
    otpBox: {
      width: 44,
      height: 52,
      textAlign: "center",
      fontSize: 20,
      padding: 0,
      border: "1px solid #DED4C1",
      borderRadius: 4,
      background: "#fff",
      color: "#2A2118",
      boxSizing: "border-box"
    },
    timerRow: { textAlign: "center", fontSize: 13, color: "#6B5E4F", marginBottom: 18 },
    backBtn: {
      background: "none",
      border: "none",
      color: "#6B5E4F",
      fontSize: 13,
      cursor: "pointer",
      padding: "0 0 14px",
      display: "flex",
      alignItems: "center",
      gap: 4
    },
    devNote: {
      marginTop: 18,
      paddingTop: 16,
      borderTop: "1px solid #DED4C1",
      fontSize: 11,
      color: "#6B5E4F",
      lineHeight: 1.6
    },
    successWrap: { textAlign: "center", padding: "20px 0 8px" },
    flame: { fontSize: 40, marginBottom: 12 },
    pwWrap: { position: "relative" },
    pwToggle: {
      position: "absolute",
      right: 11,
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#6B5E4F",
      fontSize: 12,
      padding: 4
    },
    roleBadge: {
      fontSize: 11,
      fontWeight: 500,
      padding: "3px 8px",
      borderRadius: 20,
      background: "#EFE3C9",
      color: "#7A5B12"
    },
    table: { width: "100%", borderCollapse: "collapse", marginTop: 12 },
    th: { textAlign: "left", fontSize: 11, color: "#6B5E4F", padding: "8px 6px", borderBottom: "1px solid #DED4C1" },
    td: { fontSize: 13, color: "#2A2118", padding: "8px 6px", borderBottom: "1px solid #EAE3D4" },
    productGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
      marginTop: 12
    },
    productCard: {
      background: "#fff",
      border: "1px solid #DED4C1",
      borderRadius: 8,
      padding: 10,
      boxShadow: "0 4px 12px rgba(42,33,24,0.08)",
      display: "flex",
      flexDirection: "column",
      gap: 8
    },
    productImageWrap: {
      width: "100%",
      height: 150,
      borderRadius: 6,
      overflow: "hidden",
      background: "#F7F2EA",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    productImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    },
    productBody: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    },
    productName: {
      fontSize: 14,
      fontWeight: 700,
      color: "#2A2118",
      fontFamily: "'Playfair Display', serif"
    },
    productMeta: {
      fontSize: 11,
      color: "#6B5E4F"
    },
    productPrice: {
      fontSize: 13,
      color: "#6E2A2E",
      fontWeight: 700
    },
    productActions: {
      display: "flex",
      gap: 6,
      marginTop: 8
    },
    formOverlay: {
      marginTop: 16,
      padding: 16,
      background: "#fff",
      border: "1px solid #DED4C1",
      borderRadius: 6
    },
    row: { display: "flex", gap: 10 }
  };

  return (
    <>
    <div style={styles.page}>
      <div style={step === "admin" || step === "analytics" ? styles.cardWide : styles.card}>
        <div style={styles.brand}>
          <span style={styles.brandText}>THE WAX STUDIO</span>
          {currentUser?.role === "admin" && step === "admin" && (
            <span style={styles.roleBadge}>Admin — {currentUser.name}</span>
          )}
        </div>

        <div style={styles.panel}>
          {step === "details" && (
            <div>
              <h1 style={styles.h1}>Sign up</h1>
              <p style={styles.sub}>Sign up to enjoy the features of The Wax Studio</p>

              <div style={styles.field}>
                <label style={styles.label}>Your name</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Rahul"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <div style={styles.err}>Enter your name.</div>}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Date of birth</label>
                <input
                  style={styles.input}
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
                {errors.dob && <div style={styles.err}>Enter your date of birth.</div>}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="rahul@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <div style={styles.err}>Enter a valid email address.</div>}
              </div>

              <button style={styles.btnPrimary} onClick={handleVerifyClick} disabled={loading}>
                {loading ? "Sending..." : "Verify"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#DED4C1" }} />
                <span style={{ fontSize: 12, color: "#6B5E4F" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#DED4C1" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => showToast("Google sign-in failed", "error")}
                />
              </div>

              <div style={styles.footRow}>
                Already have an account? <button type="button" style={styles.btnLink} onClick={() => setStep("login")}>Sign in</button>
              </div>
            </div>
          )}

          {step === "login" && (
            <div>
              <button style={styles.backBtn} onClick={() => setStep("details")}>
                <span>&larr;</span> Back
              </button>
              <h1 style={{ ...styles.h1, ...styles.h1Small }}>Sign in</h1>
              <p style={styles.sub}>Use your email and password to log in to The Wax Studio</p>

              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="rahul@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <div style={styles.pwWrap}>
                  <input
                    style={{ ...styles.input, paddingRight: 38 }}
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    style={styles.pwToggle}
                    onClick={() => setShowPw((s) => !s)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {errors.login && <div style={styles.err}>{errors.login}</div>}

              <button style={styles.btnPrimary} onClick={handleLoginClick} disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#DED4C1" }} />
                <span style={{ fontSize: 12, color: "#6B5E4F" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#DED4C1" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => showToast("Google sign-in failed", "error")}
                />
              </div>

              <div style={styles.footRow}>
                Don't have an account? <button type="button" style={styles.btnLink} onClick={() => setStep("details")}>Sign up</button>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div>
              <button style={styles.backBtn} onClick={() => setStep("details")}>
                <span>&larr;</span> Back
              </button>
              <h1 style={{ ...styles.h1, ...styles.h1Small }}>Verify your email</h1>
              <p style={styles.sub}>
                Enter the 5-digit code sent to <span style={{ color: "#2A2118" }}>{email}</span>
              </p>

              <div style={styles.otpRow}>
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    style={styles.otpBox}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>
              {errors.otp && <div style={{ ...styles.err, textAlign: "center" }}>{errors.otp}</div>}

              <div style={styles.timerRow}>
                {secondsLeft > 0
                  ? <>Resend available in <strong>{formatTime(secondsLeft)}</strong></>
                  : <>You can resend the code now</>}
              </div>

              <button style={styles.btnPrimary} onClick={handleVerifyOtpClick} disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <div style={styles.footRow}>
                <button
                  style={{ ...styles.btnLink, opacity: secondsLeft > 0 ? 0.5 : 1, cursor: secondsLeft > 0 ? "not-allowed" : "pointer" }}
                  onClick={handleResendClick}
                  disabled={secondsLeft > 0 || loading}
                >
                  Resend OTP
                </button>
              </div>

              <div style={styles.devNote}>Hitting your real API at localhost:5400.</div>
            </div>
          )}

          {step === "password" && (
            <div>
              <h1 style={{ ...styles.h1, ...styles.h1Small }}>Set a password</h1>
              <p style={styles.sub}>Almost done — choose a password to finish signing up</p>

              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <div style={styles.pwWrap}>
                  <input
                    style={{ ...styles.input, paddingRight: 38 }}
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    style={styles.pwToggle}
                    onClick={() => setShowPw((s) => !s)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                <div style={styles.hint}>8-12 characters, upper &amp; lowercase, a number and a symbol.</div>
                {errors.password && <div style={styles.err}>Password doesn't meet the requirements.</div>}
              </div>

              <button style={styles.btnPrimary} onClick={handleSignupClick} disabled={loading}>
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </div>
          )}

          {step === "success" && (
            <div style={styles.successWrap}>
              <div style={styles.flame}>&#127882;</div>
              <h1 style={styles.h1}>Welcome, {currentUser?.name || name || "there"}</h1>
              <p style={{ fontSize: 13, color: "#6B5E4F", lineHeight: 1.6, margin: "0 0 20px" }}>
                You're signed in. Your candle's lit — let's get started.
              </p>

              {currentUser?.role === "admin" && (
                <>
                  <button
                    style={{ ...styles.btnPrimary, background: "#7A5B12", marginBottom: 10 }}
                    onClick={() => setStep("admin")}
                  >
                    Open admin panel
                  </button>
                  <button
                    style={{ ...styles.btnPrimary, background: "#3E6E4C", marginBottom: 10 }}
                    onClick={() => setStep("analytics")}
                  >
                    Open analytics dashboard
                  </button>
                </>
              )}

              <button
                style={{ ...styles.btnPrimary, marginBottom: 10 }}
                onClick={handleLogoutClick}
                disabled={loading}
              >
                {loading ? "Logging out..." : "Logout"}
              </button>

              <button style={{ ...styles.btnPrimary, background: "#fff", color: "#6E2A2E", border: "1px solid #6E2A2E" }} onClick={resetAll}>
                Restart test flow
              </button>
            </div>
          )}

          {step === "analytics" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <button style={styles.backBtn} onClick={() => setStep("success")}>
                  <span>&larr;</span> Back
                </button>
                <button style={styles.btnSmallOutline} onClick={handleLogoutClick} disabled={loading}>
                  {loading ? "Logging out..." : "Logout"}
                </button>
              </div>

              <AnalyticsDashboard />
            </div>
          )}

          {step === "admin" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <button style={styles.backBtn} onClick={() => setStep("success")}>
                  <span>&larr;</span> Back
                </button>
                <button style={styles.btnSmallOutline} onClick={handleLogoutClick} disabled={loading}>
                  {loading ? "Logging out..." : "Logout"}
                </button>
              </div>

              <h1 style={{ ...styles.h1, ...styles.h1Small }}>Admin — inventory</h1>
              <p style={styles.sub}>Search products, or add/edit/remove listings.</p>

              <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Search by name, SKU, scent..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
                <button style={{ ...styles.btnSmall, whiteSpace: "nowrap" }} onClick={openAddProduct}>
                  + Add product
                </button>
              </div>

              {productLoading && <div style={{ fontSize: 12, color: "#6B5E4F", marginTop: 8 }}>Loading...</div>}

              {!productLoading && products.length === 0 && (
                <div style={{ marginTop: 12, color: "#6B5E4F", fontSize: 13 }}>No products found.</div>
              )}

              <div style={styles.productGrid}>
                {products.map((p) => (
                  <div key={p._id} style={styles.productCard}>
                    <div style={styles.productImageWrap}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name || "Product image"} style={styles.productImage} />
                      ) : (
                        <span style={{ color: "#8B8178" }}>No image</span>
                      )}
                    </div>

                    <div style={styles.productBody}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <span style={styles.productName}>{p.name}</span>
                        <span style={styles.roleBadge}>{p.category || "Candle"}</span>
                      </div>

                      <div style={styles.productMeta}>Scent: {p.scent || "—"}</div>
                      <div style={styles.productMeta}>SKU: {p.sku || "—"}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={styles.productPrice}>₹{p.price}</span>
                        <span style={styles.productMeta}>Stock: {p.stock}</span>
                      </div>
                      <span style={{ ...styles.productMeta, color: p.isActive === false ? "#B23A2E" : "#3E6E4C", fontWeight: 700 }}>
                        {p.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </div>

                    <div style={styles.productActions}>
                      <button style={styles.btnSmallOutline} onClick={() => openEditProduct(p)}>Edit</button>
                      {p.isActive === false && (
                        <button style={styles.btnSmall} onClick={() => handleActivateProduct(p._id)} disabled={productLoading}>
                          Activate
                        </button>
                      )}
                      <button style={styles.btnSmallDanger} onClick={() => handleDeleteProduct(p._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              {showProductForm && (
                <div style={styles.formOverlay}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#2A2118" }}>
                    {editingProductId ? "Edit product" : "Add product"}
                  </h3>

                  <div style={styles.field}>
                    <label style={styles.label}>Name</label>
                    <input
                      style={styles.input}
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Category</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={productForm.category}
                        onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                      />
                    </div>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>SKU</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={productForm.sku}
                        onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Price</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={productForm.price}
                        onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Offer Price</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={productForm.offerPrice}
                        onChange={(e) => setProductForm((f) => ({ ...f, offerPrice: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Stock</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={productForm.stock}
                        onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                      />
                    </div>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Burn Time</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={productForm.burnTime}
                        onChange={(e) => setProductForm((f) => ({ ...f, burnTime: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Scent</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={productForm.scent}
                        onChange={(e) => setProductForm((f) => ({ ...f, scent: e.target.value }))}
                      />
                    </div>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Wax Type</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={productForm.waxType}
                        onChange={(e) => setProductForm((f) => ({ ...f, waxType: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Weight</label>
                      <input
                        style={styles.input}
                        type="number"
                        value={productForm.weight}
                        onChange={(e) => setProductForm((f) => ({ ...f, weight: e.target.value }))}
                      />
                    </div>
                    <div style={{ ...styles.field, flex: 1 }}>
                      <label style={styles.label}>Color</label>
                      <input
                        style={styles.input}
                        type="text"
                        value={productForm.color}
                        onChange={(e) => setProductForm((f) => ({ ...f, color: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Tags</label>
                    <input
                      style={styles.input}
                      type="text"
                      value={productForm.tags}
                      onChange={(e) => setProductForm((f) => ({ ...f, tags: e.target.value }))}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Variants (JSON)</label>
                    <input
                      style={styles.input}
                      type="text"
                      value={productForm.variants}
                      onChange={(e) => setProductForm((f) => ({ ...f, variants: e.target.value }))}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Meta Data (JSON)</label>
                    <input
                      style={styles.input}
                      type="text"
                      value={productForm.metaData}
                      onChange={(e) => setProductForm((f) => ({ ...f, metaData: e.target.value }))}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Image</label>
                    <input
                      style={styles.input}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProductForm((f) => ({ ...f, imageFile: e.target.files[0] }))}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Description</label>
                    <input
                      style={styles.input}
                      type="text"
                      value={productForm.description}
                      onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...styles.btnSmall, flex: 1 }} onClick={handleSaveProduct} disabled={productLoading}>
                      {productLoading ? "Saving..." : "Save"}
                    </button>
                    <button style={{ ...styles.btnSmallOutline, flex: 1 }} onClick={() => setShowProductForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div style={styles.devNote}>
                GET/POST /admin/products, PUT/DELETE /admin/products/:id, GET /admin/inventory?search= — all hitting localhost:5400.
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
    </>
  );
};

export { App };