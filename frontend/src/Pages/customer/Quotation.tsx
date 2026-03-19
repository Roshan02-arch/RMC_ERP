import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../api/api";
import quotationLogo from "../../images/quotation-logo.svg";

type RequestItem = {
  rowKey: string;
  productName: string;
  quantity: number;
};

type ProductStock = {
  id: number;
  name: string;
  pricePerUnit: number;
};

type QuotationRowItem = {
  id?: number;
  productName: string;
  grade: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requirementNote?: string;
};

type QuotationRecord = {
  id: number;
  requestId: string;
  quotationNumber: string;
  customerUserId?: number;
  customerName: string;
  date: string;
  status: string;
  requestNotes: string;
  termsAndConditions: string;
  subTotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  sentAt?: string;
  respondedAt?: string;
  items: QuotationRowItem[];
};

const PRODUCT_OPTIONS = ["M-7.5", "M-10", "M-15", "M-20", "M-25", "M-30", "M-35", "M-40", "M-45", "M-50"];

const normalizeProductKey = (value: string) => String(value || "").toUpperCase().replace(/[^A-Z0-9.]/g, "");

const makeRowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const emptyRequestRow = (): RequestItem => ({
  rowKey: makeRowKey(),
  productName: PRODUCT_OPTIONS[0],
  quantity: 1,
});

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB");
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const normalizeStatus = (value: string) => String(value || "").trim().toUpperCase();

const statusLabel = (value: string) => {
  const status = normalizeStatus(value);
  if (status === "PENDING") return "Pending";
  if (status === "APPROVED") return "Approved – Quotation Preparing";
  if (status === "DRAFT") return "Approved – Quotation Preparing";
  if (status === "QUOTATION_SENT") return "Quotation Sent";
  if (status === "CUSTOMER_REVIEWED") return "Customer Reviewed";
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  return status || "-";
};

const statusClass = (value: string) => {
  const status = normalizeStatus(value);
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  if (status === "APPROVED") return "bg-blue-100 text-blue-700";
  if (status === "DRAFT") return "bg-slate-100 text-slate-700";
  if (status === "QUOTATION_SENT") return "bg-emerald-100 text-emerald-700";
  if (status === "CUSTOMER_REVIEWED") return "bg-violet-100 text-violet-700";
  if (status === "ACCEPTED") return "bg-green-100 text-green-700";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
};

const parseResponseBody = async (response: Response) => {
  const raw = await response.text();
  if (!raw) {
    return {} as Record<string, unknown>;
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { message: raw } as Record<string, unknown>;
  }
};

const toCanvasSafeColor = (value: string) => {
  if (!value) return value;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return value;

  try {
    context.fillStyle = "#000";
    context.fillStyle = value;
    return context.fillStyle;
  } catch {
    return value;
  }
};

const normalizeColorsForCanvas = (root: HTMLElement) => {
  const colorProps = [
    "color",
    "background-color",
    "border-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-decoration-color",
  ];

  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const element of nodes) {
    const computed = window.getComputedStyle(element);
    for (const property of colorProps) {
      const value = computed.getPropertyValue(property);
      if (value) {
        element.style.setProperty(property, toCanvasSafeColor(value));
      }
    }
  }
};

const applyComputedStylesToClone = (sourceRoot: HTMLElement, cloneRoot: HTMLElement) => {
  const sourceNodes = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<HTMLElement>("*"))];

  for (let index = 0; index < sourceNodes.length; index += 1) {
    const source = sourceNodes[index];
    const target = cloneNodes[index];
    if (!source || !target) continue;

    const computed = window.getComputedStyle(source);
    for (let i = 0; i < computed.length; i += 1) {
      const property = computed.item(i);
      if (!property) continue;

      let value = computed.getPropertyValue(property);
      if (!value) continue;
      if (value.includes("oklch(") || value.includes("oklab(")) {
        if (source.classList.contains("border-blue-600") || source.classList.contains("border-blue-700")) {
          value = "#2563eb";
        } else if (source.classList.contains("text-blue-800")) {
          value = "#1e40af";
        } else if (source.classList.contains("text-blue-700")) {
          value = "#1d4ed8";
        } else if (source.classList.contains("text-blue-600")) {
          value = "#2563eb";
        } else if (source.classList.contains("bg-gray-100")) {
          value = "#f3f4f6";
        } else {
          value = toCanvasSafeColor(value);
          if (value.includes("oklch(") || value.includes("oklab(")) {
            continue;
          }
        }
      }

      if (property.includes("color")) {
        value = toCanvasSafeColor(value);
      }

      target.style.setProperty(property, value, computed.getPropertyPriority(property));
    }

    target.className = "";
  }
};

const preparePrintableClone = (source: HTMLDivElement) => {
  const sourceRect = source.getBoundingClientRect();
  const sourceWidth = Math.ceil(sourceRect.width);
  const sourceHeight = Math.ceil(Math.max(source.scrollHeight, sourceRect.height));
  const captureNode = source.cloneNode(true) as HTMLDivElement;

  captureNode.style.position = "fixed";
  captureNode.style.left = "-99999px";
  captureNode.style.top = "0";
  captureNode.style.width = `${sourceWidth}px`;
  captureNode.style.minHeight = `${sourceHeight}px`;
  captureNode.style.height = `${sourceHeight}px`;
  captureNode.style.boxSizing = "border-box";
  captureNode.style.margin = "0";
  captureNode.style.background = "#ffffff";
  captureNode.style.display = "block";
  captureNode.style.overflow = "hidden";

  applyComputedStylesToClone(source, captureNode);
  normalizeColorsForCanvas(captureNode);

  return captureNode;
};

const findBestPageBreak = (
  sourceCanvas: HTMLCanvasElement,
  startY: number,
  idealEndY: number,
  maxY: number,
) => {
  const context = sourceCanvas.getContext("2d");
  if (!context) {
    return Math.min(idealEndY, maxY);
  }

  const searchRadius = 90;
  const minY = Math.max(startY + 120, idealEndY - searchRadius);
  const maxSearchY = Math.min(maxY - 1, idealEndY + searchRadius);
  if (minY >= maxSearchY) {
    return Math.min(idealEndY, maxY);
  }

  let bestY = Math.min(idealEndY, maxY);
  let bestInkScore = Number.POSITIVE_INFINITY;

  for (let y = minY; y <= maxSearchY; y += 2) {
    const rowData = context.getImageData(0, y, sourceCanvas.width, 1).data;
    let inkScore = 0;

    for (let index = 0; index < rowData.length; index += 32) {
      const red = rowData[index];
      const green = rowData[index + 1];
      const blue = rowData[index + 2];
      if (red < 245 || green < 245 || blue < 245) {
        inkScore += 1;
      }
    }

    if (inkScore < bestInkScore) {
      bestInkScore = inkScore;
      bestY = y;
      if (inkScore === 0) {
        break;
      }
    }
  }

  return Math.min(bestY, maxY);
};

const parseQuotationRecord = (row: unknown): QuotationRecord => {
  const source = (row || {}) as Record<string, unknown>;
  const items = Array.isArray(source.items) ? source.items : [];

  return {
    id: Number(source.id || 0),
    requestId: String(source.requestId || ""),
    quotationNumber: String(source.quotationNumber || ""),
    customerUserId: Number(source.customerUserId || 0),
    customerName: String(source.customerName || ""),
    date: String(source.date || ""),
    status: String(source.status || ""),
    requestNotes: String(source.requestNotes || ""),
    termsAndConditions: String(source.termsAndConditions || ""),
    subTotalAmount: Number(source.subTotalAmount || 0),
    taxAmount: Number(source.taxAmount || 0),
    discountAmount: Number(source.discountAmount || 0),
    totalAmount: Number(source.totalAmount || 0),
    createdAt: String(source.createdAt || ""),
    updatedAt: String(source.updatedAt || ""),
    approvedAt: String(source.approvedAt || ""),
    sentAt: String(source.sentAt || ""),
    respondedAt: String(source.respondedAt || ""),
    items: items.map((item) => {
      const entry = item as Record<string, unknown>;
      return {
        id: Number(entry.id || 0),
        productName: String(entry.productName || ""),
        grade: String(entry.grade || ""),
        quantity: Number(entry.quantity || 0),
        unitPrice: Number(entry.unitPrice || 0),
        totalPrice: Number(entry.totalPrice || 0),
        requirementNote: String(entry.requirementNote || ""),
      };
    }),
  };
};

const Quotation = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "my" ? "my" : "request";

  const [activeTab, setActiveTab] = useState<"request" | "my">(initialTab);
  const [items, setItems] = useState<RequestItem[]>([emptyRequestRow()]);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState<number | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [rows, setRows] = useState<QuotationRecord[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [productPriceMap, setProductPriceMap] = useState<Record<string, number>>({});
  const [productOptions, setProductOptions] = useState<string[]>(PRODUCT_OPTIONS);
  const [pdfRecord, setPdfRecord] = useState<QuotationRecord | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const userId = Number(localStorage.getItem("userId") || 0);
  const customerName = localStorage.getItem("username") || "";
  const customerContact = localStorage.getItem("userNumber") || "";
  const customerAddress = localStorage.getItem("userAddress") || "";

  const getProductUnitPrice = (productName: string) => Number(productPriceMap[normalizeProductKey(productName)] || 0);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const resolveItemUnitPrice = (item: QuotationRowItem) => {
    if (Number(item.unitPrice || 0) > 0) {
      return Number(item.unitPrice || 0);
    }
    const fallbackKey = item.productName || item.grade || "";
    return getProductUnitPrice(fallbackKey);
  };

  const resolveItemLineTotal = (item: QuotationRowItem) => {
    const explicitTotal = Number(item.totalPrice || 0);
    if (explicitTotal > 0) {
      return explicitTotal;
    }
    return resolveItemUnitPrice(item) * Number(item.quantity || 0);
  };

  const selectedSubTotal = useMemo(() => {
    if (!selectedRow) return 0;
    const computedFromRows = (selectedRow.items || []).reduce((sum, item) => sum + resolveItemLineTotal(item), 0);
    if (computedFromRows > 0) {
      return computedFromRows;
    }
    return Number(selectedRow.subTotalAmount || 0);
  }, [selectedRow, productPriceMap]);

  const selectedGst18 = useMemo(() => {
    return (selectedSubTotal * 18) / 100;
  }, [selectedSubTotal]);

  const selectedDiscount = useMemo(() => Number(selectedRow?.discountAmount || 0), [selectedRow]);

  const selectedGrandTotal = useMemo(() => {
    return Math.max(0, selectedSubTotal + selectedGst18 - selectedDiscount);
  }, [selectedDiscount, selectedGst18, selectedSubTotal]);

  const pdfSubTotal = useMemo(() => {
    if (!pdfRecord) {
      return 0;
    }
    const computedFromRows = (pdfRecord.items || []).reduce((sum, item) => sum + resolveItemLineTotal(item), 0);
    if (computedFromRows > 0) {
      return computedFromRows;
    }
    return Number(pdfRecord.subTotalAmount || 0);
  }, [pdfRecord, productPriceMap]);

  const pdfGst18 = useMemo(() => {
    return (pdfSubTotal * 18) / 100;
  }, [pdfSubTotal]);

  const pdfDiscount = useMemo(() => Number(pdfRecord?.discountAmount || 0), [pdfRecord]);

  const pdfGrandTotal = useMemo(() => {
    return Math.max(0, pdfSubTotal + pdfGst18 - pdfDiscount);
  }, [pdfDiscount, pdfGst18, pdfSubTotal]);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToast({ text, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const requestSubTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = getProductUnitPrice(item.productName);
      return sum + (price * Number(item.quantity || 0));
    }, 0);
  }, [items, productPriceMap]);

  const requestGst18 = useMemo(() => (requestSubTotal * 18) / 100, [requestSubTotal]);
  const requestGrandTotal = useMemo(() => requestSubTotal + requestGst18, [requestGst18, requestSubTotal]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const status = normalizeStatus(row.status);
      const statusMatches = statusFilter === "ALL" || status === statusFilter;
      if (!statusMatches) {
        return false;
      }
      if (!query) {
        return true;
      }
      const products = (row.items || []).map((item) => item.productName || item.grade).join(" ").toLowerCase();
      return (
        row.requestId.toLowerCase().includes(query)
        || row.quotationNumber.toLowerCase().includes(query)
        || row.customerName.toLowerCase().includes(query)
        || products.includes(query)
        || statusLabel(row.status).toLowerCase().includes(query)
      );
    });
  }, [rows, searchTerm, statusFilter]);

  const fetchProductRates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventory/products`);
      const data = await parseResponseBody(response);
      if (!response.ok || !Array.isArray(data)) {
        return;
      }

      const nextMap: Record<string, number> = {};
      const nextOptions: string[] = [];
      for (const row of data as unknown[]) {
        const entry = row as Record<string, unknown>;
        const productName = String(entry.name || "").trim();
        const price = Number(entry.pricePerUnit || 0);
        if (!productName) {
          continue;
        }
        nextMap[normalizeProductKey(productName)] = Number.isFinite(price) ? price : 0;
        nextOptions.push(productName);
      }
      setProductPriceMap(nextMap);
      if (nextOptions.length > 0) {
        setProductOptions(nextOptions);
      }
    } catch {
      // Keep UI working even if product prices fail to load.
    }
  };

  const fetchMyRows = async () => {
    if (!userId) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/quotation/my/${encodeURIComponent(String(userId))}`);
      const data = await parseResponseBody(response);
      if (!response.ok) {
        throw new Error(String((data as { message?: string })?.message || "Unable to load quotations"));
      }
      const parsed = Array.isArray(data) ? data.map(parseQuotationRecord) : [];
      setRows(parsed);
      const refId = (searchParams.get("ref") || "").trim().toUpperCase();
      const matchedByRef = refId
        ? parsed.find((row) => {
            const requestId = String(row.requestId || "").trim().toUpperCase();
            const quotationNo = String(row.quotationNumber || "").trim().toUpperCase();
            return requestId === refId || quotationNo === refId;
          })
        : null;

      if (matchedByRef) {
        setSelectedRowId(matchedByRef.id);
      } else if (parsed.length > 0 && !selectedRowId) {
        setSelectedRowId(parsed[0].id);
      }
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : "Unable to load quotations";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    void fetchMyRows();
    void fetchProductRates();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchMyRows();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [userId]);

  const setTab = (tab: "request" | "my") => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "my") {
        next.set("tab", "my");
      } else {
        next.delete("tab");
      }
      return next;
    });
  };

  const addRow = () => setItems((prev) => [...prev, emptyRequestRow()]);

  const updateRow = (rowKey: string, field: keyof RequestItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.rowKey !== rowKey) {
          return item;
        }
        if (field === "quantity") {
          return { ...item, quantity: Math.max(1, Number(value || 1)) };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const deleteRow = (rowKey: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.rowKey !== rowKey);
      return next.length > 0 ? next : [emptyRequestRow()];
    });
  };

  const resetRequestForm = () => {
    setItems([emptyRequestRow()]);
    setNotes("");
    setEditingRequestId(null);
  };

  const sendRequest = async () => {
    setError("");
    setMessage("");

    if (!userId) {
      setError("Please login again to continue.");
      showToast("Please login again to continue.", "error");
      navigate("/login");
      return;
    }

    const validItems = items
      .map((item) => ({
        productName: item.productName.trim(),
        quantity: Number(item.quantity || 0),
      }))
      .filter((item) => item.productName && item.quantity > 0);

    if (validItems.length === 0) {
      setError("Add at least one product with valid quantity.");
      showToast("Add at least one product with valid quantity.", "error");
      return;
    }

    try {
      setSending(true);

      const payload = {
        customerUserId: userId,
        customerName,
        contact: customerContact,
        address: customerAddress,
        requestNotes: notes.trim(),
        subTotalAmount: requestSubTotal,
        taxAmount: requestGst18,
        totalAmount: requestGrandTotal,
        items: validItems.map((item) => ({
          productName: item.productName,
          grade: item.productName,
          quantity: item.quantity,
          unitPrice: getProductUnitPrice(item.productName),
          totalPrice: getProductUnitPrice(item.productName) * Number(item.quantity || 0),
        })),
      };

      const endpoint = editingRequestId
        ? `${API_BASE_URL}/api/quotation/request/${editingRequestId}?userId=${encodeURIComponent(String(userId))}`
        : `${API_BASE_URL}/api/quotation/request`;

      const response = await fetch(endpoint, {
        method: editingRequestId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await parseResponseBody(response);
      if (!response.ok) {
        throw new Error(String((data as { message?: string })?.message || "Unable to send quotation request"));
      }

      const serverMessage = String((data as { message?: string })?.message || "Quotation Request Sent Successfully");
      setMessage(`✅ ${serverMessage}`);
      showToast(serverMessage, "success");
      await fetchMyRows();
      setTab("my");

      if (!editingRequestId) {
        window.setTimeout(() => {
          resetRequestForm();
        }, 600);
      } else {
        setEditingRequestId(null);
      }
    } catch (sendError) {
      const msg = sendError instanceof Error ? sendError.message : "Unable to send quotation request";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSending(false);
    }
  };

  const startEditPendingRequest = (row: QuotationRecord) => {
    const status = normalizeStatus(row.status);
    if (status !== "PENDING") {
      return;
    }

    setItems(
      row.items.length > 0
        ? row.items.map((item) => ({
            rowKey: makeRowKey(),
            productName: item.productName || item.grade || PRODUCT_OPTIONS[0],
            quantity: Math.max(1, Number(item.quantity || 1)),
          }))
        : [emptyRequestRow()],
    );
    setNotes(row.requestNotes || "");
    setEditingRequestId(row.id);
    setTab("request");
  };

  const respondToQuotation = async (id: number, action: "ACCEPT" | "REJECT") => {
    if (!userId) {
      return;
    }
    setDecisionLoading(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/quotation/${id}/decision?userId=${encodeURIComponent(String(userId))}&action=${action}`,
        { method: "PUT" },
      );
      const data = await parseResponseBody(response);
      if (!response.ok) {
        throw new Error(String((data as { message?: string })?.message || "Unable to update quotation response"));
      }
      setMessage(action === "ACCEPT" ? "Quotation accepted successfully." : "Quotation rejected successfully.");
      showToast(action === "ACCEPT" ? "Quotation accepted successfully." : "Quotation rejected successfully.", "success");
      await fetchMyRows();
    } catch (decisionError) {
      const msg = decisionError instanceof Error ? decisionError.message : "Unable to update quotation response";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setDecisionLoading(null);
    }
  };

  const markReviewed = async (quotationId: number) => {
    if (!userId) return;
    try {
      await fetch(`${API_BASE_URL}/api/quotation/${quotationId}/reviewed?userId=${encodeURIComponent(String(userId))}`, {
        method: "PUT",
      });
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    const refId = (searchParams.get("ref") || "").trim().toUpperCase();
    if (!refId || !selectedRow) {
      return;
    }

    const selectedRef = String(selectedRow.requestId || selectedRow.quotationNumber || "").trim().toUpperCase();
    if (selectedRef !== refId) {
      return;
    }

    if (normalizeStatus(selectedRow.status) === "QUOTATION_SENT") {
      void (async () => {
        await markReviewed(selectedRow.id);
        await fetchMyRows();
      })();
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("ref");
      return next;
    });
  }, [searchParams, selectedRow, setSearchParams]);

  const openQuotationPdf = async (row: QuotationRecord) => {
    setPdfLoading(true);
    setPdfRecord(row);

    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 80);
      });

      const source = pdfTemplateRef.current;
      if (!source) {
        throw new Error("Unable to render quotation PDF preview");
      }

      const captureNode = preparePrintableClone(source);
      document.body.appendChild(captureNode);

      try {
        const rect = captureNode.getBoundingClientRect();
        const canvas = await html2canvas(captureNode, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: Math.ceil(rect.width),
          height: Math.ceil(Math.max(captureNode.scrollHeight, rect.height)),
          windowWidth: Math.ceil(rect.width),
          windowHeight: Math.ceil(Math.max(captureNode.scrollHeight, rect.height)),
          scrollX: 0,
          scrollY: 0,
        });

        const pdf = new jsPDF("p", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 16;
        const drawWidth = pdfWidth - margin * 2;
        const drawHeight = pdfHeight - margin * 2;

        const pageHeightPx = Math.floor((drawHeight * canvas.width) / drawWidth);
        let pageY = 0;
        let first = true;

        while (pageY < canvas.height) {
          const remaining = canvas.height - pageY;
          const idealSliceHeight = Math.min(pageHeightPx, remaining);
          const sliceHeight =
            remaining > pageHeightPx
              ? Math.max(
                  200,
                  findBestPageBreak(canvas, pageY, pageY + idealSliceHeight, canvas.height) - pageY,
                )
              : idealSliceHeight;
          if (sliceHeight <= 0) {
            break;
          }

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const pageCtx = pageCanvas.getContext("2d");
          if (!pageCtx) {
            break;
          }

          pageCtx.fillStyle = "#ffffff";
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(canvas, 0, pageY, canvas.width, sliceHeight, 0, 0, pageCanvas.width, pageCanvas.height);

          const pageImg = pageCanvas.toDataURL("image/png");
          const renderHeight = (sliceHeight * drawWidth) / canvas.width;
          if (!first) {
            pdf.addPage();
          }
          pdf.addImage(pageImg, "PNG", margin, margin, drawWidth, renderHeight);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(1);
          pdf.rect(margin, margin, drawWidth, drawHeight);

          first = false;
          pageY += sliceHeight;
        }

        const fileName = (row.quotationNumber || row.requestId || "quotation").replace(/[\\/:*?"<>|\s]+/g, "-");
        const blobUrl = pdf.output("bloburl");
        const opened = window.open(blobUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          pdf.save(`${fileName}.pdf`);
        }
      } finally {
        captureNode.remove();
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleViewQuotation = async (row: QuotationRecord) => {
    try {
      setSelectedRowId(row.id);
      if (normalizeStatus(row.status) === "QUOTATION_SENT") {
        await markReviewed(row.id);
        await fetchMyRows();
      }
      await openQuotationPdf(row);
      showToast("Quotation opened successfully.", "success");
    } catch (viewError) {
      const msg = viewError instanceof Error ? viewError.message : "Unable to open quotation PDF";
      setError(msg);
      showToast(msg, "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="mx-auto max-w-7xl px-6 pb-10 pt-24 space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h1 className="text-2xl font-bold text-gray-800">Quotation</h1>
          <p className="mt-2 text-sm text-gray-600">Create quotation requests, track status, and review quotations sent by admin.</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setTab("request")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === "request" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Add Quotation Request
            </button>
            <button
              type="button"
              onClick={() => setTab("my")}
              className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === "my" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              My Quotations
            </button>
          </div>
        </div>

        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
        )}
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        {toast && (
          <div
            className={`fixed right-5 top-5 z-[9999] rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-600"
                : toast.type === "error"
                  ? "bg-rose-600"
                  : "bg-slate-700"
            }`}
          >
            {toast.text}
          </div>
        )}

        {activeTab === "request" && (
          <section className="rounded-2xl bg-white p-6 shadow-md space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">Add Quotation Request</h2>
              <button
                type="button"
                onClick={addRow}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                disabled={sending}
              >
                Add Product
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Unit Price</th>
                    <th className="px-4 py-3">Line Total</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map((item) => (
                    <tr key={item.rowKey}>
                      <td className="px-4 py-3">
                        <select
                          value={item.productName}
                          onChange={(event) => updateRow(item.rowKey, "productName", event.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          disabled={sending}
                        >
                          {productOptions.map((product) => (
                            <option key={product} value={product}>{product}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) => updateRow(item.rowKey, "quantity", Number(event.target.value))}
                          className="w-32 rounded-md border border-gray-300 px-3 py-2"
                          disabled={sending}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">
                        {money(getProductUnitPrice(item.productName))}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        {money(getProductUnitPrice(item.productName) * Number(item.quantity || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => deleteRow(item.rowKey)}
                          className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                          disabled={sending}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 md:grid-cols-2">
              <p><span className="font-semibold text-gray-900">Products Subtotal:</span> {money(requestSubTotal)}</p>
              <p><span className="font-semibold text-gray-900">GST (18%):</span> {money(requestGst18)}</p>
              <p className="md:col-span-2"><span className="font-semibold text-gray-900">Total Cost (incl. GST):</span> {money(requestGrandTotal)}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Notes / Requirements</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                placeholder="Any specific requirement for admin..."
                disabled={sending}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void sendRequest()}
                disabled={sending}
                className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : editingRequestId ? "Update Quotation Request" : "Send Quotation Request"}
              </button>

              <button
                type="button"
                onClick={resetRequestForm}
                className="rounded-md bg-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                disabled={sending}
              >
                Reset
              </button>

            </div>
          </section>
        )}

        {activeTab === "my" && (
          <section className="rounded-2xl bg-white p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">My Quotations</h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search request, product..."
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DRAFT">Approved – Quotation Preparing</option>
                  <option value="QUOTATION_SENT">Quotation Sent</option>
                  <option value="CUSTOMER_REVIEWED">Customer Reviewed</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button
                  type="button"
                  onClick={() => void fetchMyRows()}
                  className="rounded-md bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Request ID</th>
                    <th className="px-4 py-3">Products</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loadingRows ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">Loading...</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No quotation requests found.</td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.requestId || row.quotationNumber || "-"}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {(row.items || []).map((item) => `${item.productName || item.grade} (${item.quantity})`).join(", ") || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formatDateTime(row.createdAt || row.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleViewQuotation(row)}
                              disabled={pdfLoading}
                              className="rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600"
                            >
                              {pdfLoading ? "Opening PDF..." : "View Quotation"}
                            </button>
                            {normalizeStatus(row.status) === "PENDING" && (
                              <button
                                type="button"
                                onClick={() => startEditPendingRequest(row)}
                                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {selectedRow && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-gray-800">Quotation Details</h3>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(selectedRow.status)}`}>
                    {statusLabel(selectedRow.status)}
                  </span>
                </div>

                <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2">
                  <p><span className="font-semibold text-gray-900">Request ID:</span> {selectedRow.requestId || selectedRow.quotationNumber || "-"}</p>
                  <p><span className="font-semibold text-gray-900">Quotation No:</span> {selectedRow.quotationNumber || "-"}</p>
                  <p><span className="font-semibold text-gray-900">Created:</span> {formatDateTime(selectedRow.createdAt)}</p>
                  <p><span className="font-semibold text-gray-900">Approved:</span> {formatDateTime(selectedRow.approvedAt)}</p>
                  <p><span className="font-semibold text-gray-900">Sent:</span> {formatDateTime(selectedRow.sentAt)}</p>
                  <p><span className="font-semibold text-gray-900">Responded:</span> {formatDateTime(selectedRow.respondedAt)}</p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Price</th>
                        <th className="px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedRow.items || []).map((item, index) => (
                        <tr key={`${item.id || index}-${item.productName}`}>
                          <td className="px-3 py-2">{item.productName || item.grade || "-"}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2">{money(resolveItemUnitPrice(item))}</td>
                          <td className="px-3 py-2 font-semibold">{money(resolveItemLineTotal(item))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                  <p><span className="font-semibold text-gray-900">Sub Total:</span> {money(selectedSubTotal)}</p>
                  <p><span className="font-semibold text-gray-900">GST (18%):</span> {money(selectedGst18)}</p>
                  <p><span className="font-semibold text-gray-900">Discount:</span> {money(selectedDiscount)}</p>
                  <p><span className="font-semibold text-gray-900">Total Amount:</span> {money(selectedGrandTotal)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleViewQuotation(selectedRow)}
                    disabled={pdfLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    {pdfLoading ? "Opening PDF..." : "Open Quotation PDF"}
                  </button>
                </div>

                {selectedRow.requestNotes && (
                  <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Request Notes:</span> {selectedRow.requestNotes}</p>
                )}
                {selectedRow.termsAndConditions && (
                  <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Terms:</span> {selectedRow.termsAndConditions}</p>
                )}

                {(normalizeStatus(selectedRow.status) === "QUOTATION_SENT" || normalizeStatus(selectedRow.status) === "CUSTOMER_REVIEWED") && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void respondToQuotation(selectedRow.id, "ACCEPT")}
                      disabled={decisionLoading === selectedRow.id}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {decisionLoading === selectedRow.id ? "Processing..." : "Accept Quotation"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void respondToQuotation(selectedRow.id, "REJECT")}
                      disabled={decisionLoading === selectedRow.id}
                      className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                    >
                      {decisionLoading === selectedRow.id ? "Processing..." : "Reject Quotation"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <div className="fixed left-[-9999px] top-0 z-[-1] w-[794px] bg-white">
        {pdfRecord && (
          <div ref={pdfTemplateRef} className="quotation-print-root mx-auto w-[210mm] min-h-[297mm] bg-white font-[Arial,sans-serif] text-black text-[13px] leading-relaxed p-4">
            <div className="border-y-2 border-blue-600 py-2">
              <div className="grid grid-cols-[72px_1fr] items-center gap-3">
                <div className="flex justify-center">
                  <img src={quotationLogo} alt="RRY Infra logo" className="h-16 w-auto" />
                </div>
                <div className="text-center leading-tight">
                  <h2 className="text-[24px] font-bold text-blue-800">RRY INFRA PVT. LTD.</h2>
                  <p className="text-[13px] font-semibold">(All type of construction works and RMC Supplier)</p>
                  <p className="text-[12px]">Corporate Office: 01 &amp; 02, Laxmi Enclave, Pandit Colony, Gangapur Road, Nashik-422005.</p>
                  <p className="text-[12px]">Contact: +91 8530736867, Email: rryinfra@gmail.com.</p>
                </div>
              </div>
            </div>

            <h3 className="pb-2 pt-3 text-center text-[20px] font-bold underline">SALE QUOTATION</h3>

            <div className="mb-5 mt-3 grid grid-cols-2 text-[12px]">
              <div className="space-y-2">
                <p className="font-semibold">To,</p>
                <p className="border-b border-black pb-1">{pdfRecord.customerName || "-"}</p>
                <p className="border-b border-black pb-1">{pdfRecord.address || "-"}</p>
                <p><span className="font-semibold">Kind Attn:</span> {pdfRecord.customerName || "-"}</p>
                <p><span className="font-semibold">MO No:</span> {pdfRecord.contact || "-"}</p>
                <p><span className="font-semibold">Site Location:</span> {pdfRecord.requestNotes || pdfRecord.termsAndConditions || "-"}</p>
              </div>
              <div className="space-y-2 text-right">
                <p><span className="font-semibold">Qtn. No.:</span> <span className="border-b border-black pb-1">{pdfRecord.quotationNumber || "-"}</span></p>
                <p><span className="font-semibold">Date:</span> <span className="border-b border-black pb-1">{formatDateTime(pdfRecord.sentAt || pdfRecord.updatedAt || pdfRecord.date)}</span></p>
                <p><span className="font-semibold">Request ID:</span> {pdfRecord.requestId || "-"}</p>
              </div>
            </div>

            <div className="mb-5 text-[12px] leading-[1.55]">
              <p className="font-semibold">Dear Sir,</p>
              <p>With reference to your inquiry and discussed, we are pleased to give you our offer for the following grade of concrete. This quotation is made on and it&apos;s subject to the terms below.</p>
            </div>

            <div className="overflow-hidden border border-black">
              <table className="quotation-table w-full text-[12px]">
                <thead>
                  <tr className="bg-gray-100 font-semibold">
                    <th className="border border-black px-2 py-2">Sr. No.</th>
                    <th className="border border-black px-2 py-2">Grade of RMC</th>
                    <th className="border border-black px-2 py-2">Unit</th>
                    <th className="border border-black px-2 py-2">Rate (₹)</th>
                    <th className="border border-black px-2 py-2">Qty</th>
                    <th className="border border-black px-2 py-2">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(pdfRecord.items || []).map((item, index) => (
                    <tr key={`${item.id || index}-${item.productName}`}>
                      <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                      <td className="border border-black px-2 py-2 text-center">{item.productName || item.grade || "-"}</td>
                      <td className="border border-black px-2 py-2 text-center">Per Cum</td>
                      <td className="border border-black px-2 py-2 text-center">{resolveItemUnitPrice(item).toFixed(2)}</td>
                      <td className="border border-black px-2 py-2 text-center">{item.quantity || 0}</td>
                      <td className="border border-black px-2 py-2 text-center">{resolveItemLineTotal(item).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 ml-auto w-[320px] space-y-1 text-[12px]">
              <p className="flex justify-between"><span>Sub Total:</span><span>{money(pdfSubTotal)}</span></p>
              <p className="flex justify-between"><span>GST (18%):</span><span>{money(pdfGst18)}</span></p>
              <p className="flex justify-between"><span>Discount:</span><span>{money(pdfDiscount)}</span></p>
              <p className="flex justify-between border-t border-black pt-1 font-bold"><span>Total Amount:</span><span>{money(pdfGrandTotal)}</span></p>
            </div>

            <div className="mt-5 text-[11px] leading-[1.5]">
              <p className="font-bold underline">TERMS AND CONDITIONS:</p>
              <div className="mt-2 space-y-1.5">
                <p className="font-semibold">1. GENERAL:</p>
                <ul className="list-disc space-y-1 pl-8">
                  <li>
                    The above rates are inclusive of cost of raw materials, study &amp; recommendation of mix designs and direct/indirect cost of operation
                    in plant and transportation of concrete from plant to your site.
                  </li>
                  <li>Above rates are inclusive of GST @ 18%.</li>
                </ul>
                <p className="font-semibold">2. PUMP CHARGES:</p>
                <ul className="list-disc space-y-1 pl-8">
                  <li>100% discount given on pumping service considering the Total Project Quantum.</li>
                  <li>If the quantity of RMC is less than 40 cum, the pumping charge will be additional at the rate of Rs. 8,000/- per day.</li>
                  <li>If the quantity of RMC is more than 40 cum, the pumping charge will be free.</li>
                </ul>
                <p className="font-semibold">3. QUALITY:</p>
                <ul className="list-disc space-y-1 pl-8">
                  <li>Mix design as per IS-10262 &amp; IS-456. Any grade change requirement will revise the rates.</li>
                  <li>
                    Unloading of concrete to be done within 3:00 hrs from the time TM reaches site; if unloaded after 3:00 hrs, we are not responsible for
                    quality issues.
                  </li>
                  <li>The placement of concrete, vibration, levelling, compacting, curing &amp; shrinkage cracks control is your responsibility.</li>
                  <li>
                    Testing of concrete will be carried out at our Plant Laboratory as per Indian Standards. Third-party testing, if required, shall be
                    informed to our QC Engineer.
                  </li>
                  <li>Any complaint/dispute must be reported in writing within 48 hrs from date of supply.</li>
                  <li>
                    We are only responsible for 7 days cube test results and 28 days test results for specimens casted by our trained Field Technician and
                    cured &amp; tested at our Plant Laboratory.
                  </li>
                </ul>
                <p className="font-semibold">4. PAYMENT TERMS:</p>
                <ul className="list-disc space-y-1 pl-8">
                  <li>Above amount is tentative; final quantity will be considered after work done at actual site.</li>
                  <li>The detailed payment conditions will be finalised after mutual discussion.</li>
                  <li>Payment to be done by Cheque/Demand Draft/RTGS from any bank in favour of M/s. RRY Infra Pvt Ltd. payable at Nashik.</li>
                  <li>A/c Details: 186805003232, IFSC Code-ICIC0001868, ICICI Bank, Bodhale-Nagar Branch, Nashik.</li>
                  <li>50% advance and 50% payable within 14 days.</li>
                </ul>
                <p className="font-semibold">5. VALIDITY:</p>
                <ul className="list-disc space-y-1 pl-8">
                  <li>The rates quoted are valid for 7 days.</li>
                </ul>
                {pdfRecord.termsAndConditions && <p>{pdfRecord.termsAndConditions}</p>}
              </div>
            </div>

            <div className="mt-6 text-[12px] leading-[1.6]">
              <p>We hope you find the above quotation in line with your requirements. Please feel free to contact us for any queries.</p>
              <p className="mt-4">Looking forward to receive your valuable purchase order &amp; assuring you of our best services at all times.</p>
              <p className="mt-4">Thanking you,</p>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto] items-end">
              <div className="text-[14px] font-semibold leading-snug">
                <p>M/s. RRY INFRA PVT. LTD.</p>
                <p className="text-[12px]">Contact Person:</p>
                <p className="text-[12px]">Ashish Jha - 7347430750</p>
              </div>
              <div className="text-right">
                <img src="/iso-badge.png" alt="ISO 9001:2015 Certified" className="h-24 w-24 object-contain" />
              </div>
            </div>

            <div className="mt-8 border-y-2 border-blue-600 py-1.5 text-center text-[11px] font-semibold text-blue-800">
              <p>RMC Plant 1: Gat No.135/01, Naigaon Road, Brahmanwade, Sinnar, Nashik-422103.</p>
              <p>RMC Plant 2:1792, Adgaon, Jaulakedindori, Nashik, Maharashtra 422003.</p>
              <p>For Orders: +91 8530736867</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quotation;