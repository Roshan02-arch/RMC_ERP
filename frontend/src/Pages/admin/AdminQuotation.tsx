import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { API_BASE_URL } from "../../api/api";
import aboutImage from "../../images/about.jpg";
import quotationLogo from "../../images/quotation-logo.svg";

type QuotationItem = {
  id?: number;
  rowKey: string;
  productName: string;
  grade: string;
  units: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type QuotationRecord = {
  id: number;
  quotationNumber: string;
  customerName: string;
  date: string;
  totalAmount: number;
  address: string;
  contact: string;
  gstNo: string;
  siteName: string;
  contactPerson: string;
  items: QuotationItem[];
};

type QuotationForm = {
  id?: number;
  quotationNumber: string;
  customerName: string;
  date: string;
  address: string;
  contact: string;
  gstNo: string;
  siteName: string;
  contactPerson: string;
  items: QuotationItem[];
};

type EditorMode = "none" | "create" | "edit" | "view";

const defaultGrades = ["M-7.5", "M-10", "M-15", "M-20", "M-25", "M-30", "M-35", "M-40", "M-45", "M-50"];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (dateValue?: string) => {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("en-GB");
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const generateQuotationNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `QTN/${y}${m}${d}/${hh}${mm}${ss}`;
};

const makeRowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const emptyItem = (grade = ""): QuotationItem => ({
  rowKey: makeRowKey(),
  productName: grade,
  grade,
  units: "CUM",
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
});

const defaultItems = () => defaultGrades.map((grade) => emptyItem(grade));

const normalizeNumber = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
};

const calculateItemTotal = (item: QuotationItem) => normalizeNumber(item.quantity) * normalizeNumber(item.unitPrice);

const recalculateItems = (items: QuotationItem[]) =>
  items.map((item) => ({
    ...item,
    quantity: normalizeNumber(item.quantity),
    unitPrice: normalizeNumber(item.unitPrice),
    totalPrice: calculateItemTotal(item),
  }));

const emptyForm = (): QuotationForm => ({
  quotationNumber: generateQuotationNumber(),
  customerName: "",
  date: todayDate(),
  address: "",
  contact: "",
  gstNo: "",
  siteName: "",
  contactPerson: "",
  items: recalculateItems(defaultItems()),
});

const mapRecordToForm = (record: QuotationRecord): QuotationForm => ({
  id: record.id,
  quotationNumber: record.quotationNumber || "",
  customerName: record.customerName || "",
  date: record.date ? String(record.date).slice(0, 10) : todayDate(),
  address: record.address || "",
  contact: record.contact || "",
  gstNo: record.gstNo || "",
  siteName: record.siteName || "",
  contactPerson: record.contactPerson || "",
  items: recalculateItems(
    (record.items || []).map((item) => ({
      id: item.id,
      rowKey: makeRowKey(),
      productName: item.productName || "",
      grade: item.grade || "",
      units: item.units || "CUM",
      quantity: normalizeNumber(item.quantity),
      unitPrice: normalizeNumber(item.unitPrice),
      totalPrice: normalizeNumber(item.totalPrice),
    })),
  ),
});

const sheetTextLine = "FACTORY ADDRESS : -   GAT NO. 135/1, NAIGAON ROAD, AT POST BRAMHANWADE, TAL - SINNAR   DIST NASHIK 422103";

const parseApiBody = async (response: Response) => {
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

const normalizeColorsForCanvas = (root: HTMLElement) => {
  const colorProperties = [
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
    for (const property of colorProperties) {
      const resolved = computed.getPropertyValue(property);
      if (resolved) {
        element.style.setProperty(property, resolved);
      }
    }
  }
};

const QuotationSheet = ({
  form,
  readOnly,
  onFieldChange,
  onItemChange,
  onAddRow,
  onDeleteRow,
}: {
  form: QuotationForm;
  readOnly: boolean;
  onFieldChange?: (field: keyof Omit<QuotationForm, "items" | "id">, value: string) => void;
  onItemChange?: (rowKey: string, field: keyof QuotationItem, value: string | number) => void;
  onAddRow?: () => void;
  onDeleteRow?: (rowKey: string) => void;
}) => {
  const totalAmount = useMemo(
    () => recalculateItems(form.items).reduce((sum, item) => sum + item.totalPrice, 0),
    [form.items],
  );

  const renderHeaderField = (
    label: string,
    field: keyof Omit<QuotationForm, "items" | "id">,
    placeholder = "",
    type: "text" | "date" = "text",
  ) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 font-semibold text-gray-700">{label}</span>
      <span className="text-gray-700">:</span>
      {readOnly ? (
        <span className="border-b border-gray-700 min-h-7 flex-1 px-2 py-1 text-gray-900">{form[field] || "-"}</span>
      ) : (
        <input
          type={type}
          value={form[field] || ""}
          onChange={(event) => onFieldChange?.(field, event.target.value)}
          className="border-b border-gray-700 flex-1 px-2 py-1 outline-none"
          placeholder={placeholder}
        />
      )}
    </div>
  );

  return (
    <div className="border-[3px] border-black bg-white">
      <div className="border-b-2 border-black grid grid-cols-[175px_1fr] min-h-[160px]">
        <div className="border-r-2 border-black flex items-center justify-center px-2 py-2 bg-white">
          <img src={quotationLogo} alt="RRY Infra logo" className="h-[156px] w-auto" />
        </div>
        <div className="bg-[#8fb2d2] text-center px-3 py-1.5 flex flex-col justify-center">
          <p className="text-[10px] tracking-[0.18em] text-gray-700 leading-none">|| SHREE ||</p>
          <h2 className="mt-1 text-[28px] font-semibold leading-none tracking-wide">RRY INFRA PRIVATE LIMITED</h2>
          <p className="mt-3 text-[10px] font-semibold leading-none">ALL TYPES OF CONCRETE SUPPLY</p>
          <p className="mt-2 text-[10px] leading-none whitespace-nowrap">{sheetTextLine}</p>
          <p className="mt-1 text-[10px] text-red-600 italic leading-none underline">Email - RRYinfra@gmail.com</p>
        </div>
      </div>

      <div className="border-b-2 border-black bg-[#8fb2d2] text-center text-[30px] font-semibold py-1">QUOTATION</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 py-4 border-b-2 border-black">
        <div className="space-y-2">
          {renderHeaderField("CUSTOMER NAME", "customerName", "Enter customer name")}
          {renderHeaderField("ADDRESS", "address", "Enter address")}
          {renderHeaderField("CONTACT", "contact", "Enter contact")}
          {renderHeaderField("GST NO", "gstNo", "Enter GST number")}
          {renderHeaderField("SITE NAME", "siteName", "Enter site name")}
        </div>
        <div className="space-y-2">
          {renderHeaderField("Date", "date", "", "date")}
          {renderHeaderField("QTN NO.", "quotationNumber", "Enter quotation number")}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="border border-black px-3 py-2">Sr. No.</th>
              <th className="border border-black px-3 py-2">Grade Name</th>
              <th className="border border-black px-3 py-2">Units</th>
              <th className="border border-black px-3 py-2">Qty</th>
              <th className="border border-black px-3 py-2">Rate (Inclusive GST)</th>
              {!readOnly && <th className="border border-black px-3 py-2">Row Action</th>}
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, index) => (
              <tr key={item.rowKey} className="bg-white">
                <td className="border border-black px-3 py-2 text-center">{index + 1}</td>
                <td className="border border-black px-2 py-1">
                  {readOnly ? (
                    <span>{item.grade || "-"}</span>
                  ) : (
                    <input
                      value={item.grade}
                      onChange={(event) => onItemChange?.(item.rowKey, "grade", event.target.value)}
                      className="w-full px-2 py-1 outline-none"
                      placeholder="Grade"
                    />
                  )}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {readOnly ? (
                    <span>{item.units || "CUM"}</span>
                  ) : (
                    <input
                      value={item.units}
                      onChange={(event) => onItemChange?.(item.rowKey, "units", event.target.value)}
                      className="w-full px-2 py-1 outline-none text-center"
                    />
                  )}
                </td>
                <td className="border border-black px-2 py-1">
                  {readOnly ? (
                    <span className="block text-center">{item.quantity.toFixed(2)}</span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(event) => onItemChange?.(item.rowKey, "quantity", Number(event.target.value))}
                      className="w-full px-2 py-1 outline-none text-center"
                    />
                  )}
                </td>
                <td className="border border-black px-2 py-1">
                  {readOnly ? (
                    <span className="block text-right">{item.unitPrice.toFixed(2)}</span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(event) => onItemChange?.(item.rowKey, "unitPrice", Number(event.target.value))}
                      className="w-full px-2 py-1 outline-none text-right"
                    />
                  )}
                </td>
                {!readOnly && (
                  <td className="border border-black px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow?.(item.rowKey)}
                      className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="px-4 py-3 border-b border-black">
          <button
            type="button"
            onClick={onAddRow}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Add Row
          </button>
        </div>
      )}

      <div className="border-t-2 border-black bg-[#cdddc6] px-4 py-3 text-sm">
        <p className="font-bold text-red-700">Terms &amp; Conditions:</p>
        <p className="font-semibold">Pumping Charges:</p>
        <p>1 flat charge of ₹14,000/- per day will apply for pumping quantities less than 50 cum.</p>
        <p>No pumping charges will be applied for quantities above 50 cum.</p>
        <p>For quantities above 50 cum, the pumping rate will be ₹150/- per cum.</p>
        <p className="font-semibold mt-1">Pumping Operations:</p>
        <p>
          Pumping involves installation of pipelines using clamps. The pipeline must be properly secured to ensure smooth and uninterrupted operation.
        </p>
        <p className="font-semibold mt-1">Transportation Charges:</p>
        <p>An additional transportation charge of ₹1,500/- will apply for vehicle orders below 5 cum.</p>
        <p className="font-semibold mt-1">Height-Based Charges:</p>
        <p>For every additional 15 meters of height beyond the specified 30 meters, the pumping rate will increase by ₹50/- per cum.</p>
        <p>
          The above rates are based on your mix design as per IS 10262 &amp; IS 456. Any changes to the mix requirements will result in a revised rate.
        </p>
      </div>
      <div className="border-t border-black bg-[#f4d0b5] px-4 py-3 text-sm">
        <p className="font-semibold">Payment Terms:</p>
        <p>Payment must be cleared within 15 days of invoice submission.</p>
      </div>
      <div className="border-t border-black bg-black text-white px-4 py-2 text-xs">
        OFFICE ADD:- 01 &amp; 02 , LAXMI ENCLAVE , PANDIT COLONY , GANGAPUR ROAD , NASHIK-422005
      </div>
      <div className="border-t border-black grid grid-cols-[40%_60%] min-h-[130px]">
        <div className="border-r border-black h-full">
          <img src={aboutImage} alt="RRY transport" className="h-full w-full object-cover object-left-top" />
        </div>
        <div className="h-full flex flex-col">
          <div className="bg-[#8fb2d2] px-4 py-2 text-lg border-b border-black">Contact Person :-</div>
          <div className="p-3 flex-1">
            {readOnly ? (
              <div className="min-h-8 border-b border-gray-700 text-base px-2 py-1">{form.contactPerson || "-"}</div>
            ) : (
              <input
                type="text"
                value={form.contactPerson}
                onChange={(event) => onFieldChange?.("contactPerson", event.target.value)}
                className="w-full min-h-8 border-b border-gray-700 px-2 py-1 outline-none text-base"
                placeholder="Enter contact person"
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-black px-4 py-3 bg-gray-50 flex justify-end">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">Total Amount</p>
          <p className="text-xl font-bold text-gray-900">{money(totalAmount)}</p>
        </div>
      </div>
    </div>
  );
};

const AdminQuotation = () => {
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [mode, setMode] = useState<EditorMode>("none");
  const [form, setForm] = useState<QuotationForm>(emptyForm());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pdfPreviewRecord, setPdfPreviewRecord] = useState<QuotationRecord | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  const formTotalAmount = useMemo(
    () => recalculateItems(form.items).reduce((sum, item) => sum + item.totalPrice, 0),
    [form.items],
  );

  const parseRecord = (raw: unknown): QuotationRecord => {
    const source = (raw ?? {}) as Record<string, unknown>;
    const itemRows = Array.isArray(source.items) ? source.items : [];

    return {
      id: Number(source.id || 0),
      quotationNumber: String(source.quotationNumber || ""),
      customerName: String(source.customerName || ""),
      date: String(source.date || ""),
      totalAmount: Number(source.totalAmount || 0),
      address: String(source.address || ""),
      contact: String(source.contact || ""),
      gstNo: String(source.gstNo || ""),
      siteName: String(source.siteName || ""),
      contactPerson: String(source.contactPerson || ""),
      items: recalculateItems(
        itemRows.map((entry) => {
          const row = entry as Record<string, unknown>;
          return {
            id: Number(row.id || 0),
            rowKey: makeRowKey(),
            productName: String(row.productName || ""),
            grade: String(row.grade || ""),
            units: "CUM",
            quantity: Number(row.quantity || 0),
            unitPrice: Number(row.unitPrice || 0),
            totalPrice: Number(row.totalPrice || 0),
          };
        }),
      ),
    };
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/quotation/list`);
      const data = (await parseApiBody(response)) as unknown;
      if (!response.ok) {
        const maybeMessage = (data as { message?: string })?.message;
        throw new Error(maybeMessage || "Unable to load quotations");
      }
      const rows = Array.isArray(data) ? data.map(parseRecord) : [];
      setQuotations(rows);
    } catch (error) {
      console.error(error);
      setMessage(`Unable to load quotations. Ensure backend is running on ${API_BASE_URL}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, []);

  const fetchById = async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/api/admin/quotation/${id}`);
    const data = await parseApiBody(response);
    if (!response.ok) {
      throw new Error(String((data as { message?: string })?.message || "Unable to load quotation"));
    }
    return parseRecord(data as unknown);
  };

  const startNewQuotation = () => {
    setMessage("");
    setMode("create");
    setForm(emptyForm());
  };

  const handleView = async (id: number) => {
    try {
      setMessage("");
      const record = await fetchById(id);
      setForm(mapRecordToForm(record));
      setMode("view");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Unable to open quotation");
    }
  };

  const handleEdit = async (id: number) => {
    try {
      setMessage("");
      const record = await fetchById(id);
      setForm(mapRecordToForm(record));
      setMode("edit");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Unable to edit quotation");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this quotation?")) {
      return;
    }
    try {
      setDeletingId(id);
      setMessage("");
      const response = await fetch(`${API_BASE_URL}/api/admin/quotation/delete/${id}`, {
        method: "DELETE",
      });
      const data = await parseApiBody(response);
      if (!response.ok) {
        setMessage(String((data as { message?: string })?.message || "Unable to delete quotation"));
        return;
      }
      setMessage("Quotation deleted successfully.");
      await fetchList();
      if (form.id === id) {
        setMode("none");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to delete quotation.");
    } finally {
      setDeletingId(null);
    }
  };

  const updateField = (field: keyof Omit<QuotationForm, "items" | "id">, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const updateItem = (rowKey: string, field: keyof QuotationItem, value: string | number) => {
    setForm((previous) => {
      const nextItems = previous.items.map((item) => {
        if (item.rowKey !== rowKey) {
          return item;
        }
        const nextItem = {
          ...item,
          [field]: field === "quantity" || field === "unitPrice" ? Number(value || 0) : value,
        };
        if (field === "grade") {
          nextItem.productName = String(value || "");
        }
        return { ...nextItem, totalPrice: calculateItemTotal(nextItem) };
      });
      return { ...previous, items: recalculateItems(nextItems) };
    });
  };

  const addRow = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, emptyItem()],
    }));
  };

  const deleteRow = (rowKey: string) => {
    setForm((previous) => {
      const nextItems = previous.items.filter((item) => item.rowKey !== rowKey);
      return {
        ...previous,
        items: nextItems.length > 0 ? nextItems : [emptyItem()],
      };
    });
  };

  const buildPayload = () => ({
    quotationNumber: form.quotationNumber.trim(),
    customerName: form.customerName.trim(),
    date: form.date,
    totalAmount: formTotalAmount,
    address: form.address.trim(),
    contact: form.contact.trim(),
    gstNo: form.gstNo.trim(),
    siteName: form.siteName.trim(),
    contactPerson: form.contactPerson.trim(),
    items: recalculateItems(form.items).map((item) => ({
      id: item.id,
      productName: (item.productName || item.grade || "").trim(),
      grade: item.grade.trim(),
      quantity: normalizeNumber(item.quantity),
      unitPrice: normalizeNumber(item.unitPrice),
      totalPrice: calculateItemTotal(item),
    })),
  });

  const saveQuotation = async () => {
    if (mode !== "create" && mode !== "edit") {
      return;
    }
    if (!form.quotationNumber.trim() || !form.customerName.trim()) {
      setMessage("Quotation Number and Customer Name are required.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const endpoint =
        mode === "create"
          ? `${API_BASE_URL}/api/admin/quotation/create`
          : `${API_BASE_URL}/api/admin/quotation/update/${form.id}`;

      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = await parseApiBody(response);
      if (!response.ok) {
        setMessage(String((data as { message?: string })?.message || "Unable to save quotation"));
        return;
      }

      setMessage(mode === "create" ? "Quotation created successfully." : "Quotation updated successfully.");
      setMode("none");
      setForm(emptyForm());
      await fetchList();
    } catch (error) {
      console.error(error);
      setMessage("Unable to save quotation.");
    } finally {
      setLoading(false);
    }
  };

  const renderRecordToPdf = async (record: QuotationRecord) => {
    setPdfPreviewRecord(record);

    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 40);
    });

    if (!pdfRef.current) {
      throw new Error("Unable to render quotation PDF");
    }

    normalizeColorsForCanvas(pdfRef.current);

    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 1400,
    });

    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pdfWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    let heightLeft = imageHeight;
    let yPosition = 0;

    pdf.addImage(image, "PNG", 0, yPosition, imageWidth, imageHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      yPosition = heightLeft - imageHeight;
      pdf.addPage();
      pdf.addImage(image, "PNG", 0, yPosition, imageWidth, imageHeight);
      heightLeft -= pdfHeight;
    }

    const safeNumber = record.quotationNumber.replace(/[\\/:*?"<>|\s]+/g, "-") || "quotation";
    pdf.save(`${safeNumber}.pdf`);
  };

  const handleDownload = async (id: number) => {
    try {
      setMessage("");
      const record = await fetchById(id);
      await renderRecordToPdf(record);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Unable to download PDF");
    }
  };

  const handleDownloadCurrent = async () => {
    try {
      setMessage("");
      const tempRecord: QuotationRecord = {
        id: Number(form.id || 0),
        quotationNumber: form.quotationNumber || generateQuotationNumber(),
        customerName: form.customerName,
        date: form.date,
        totalAmount: formTotalAmount,
        address: form.address,
        contact: form.contact,
        gstNo: form.gstNo,
        siteName: form.siteName,
        contactPerson: form.contactPerson,
        items: recalculateItems(form.items),
      };
      await renderRecordToPdf(tempRecord);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Unable to download PDF");
    }
  };

  const readOnly = mode === "view";
  const showEditor = mode !== "none";

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Quotation</h2>
        <button
          type="button"
          onClick={startNewQuotation}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          New Quotation
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">{message}</p>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Saved Quotations List</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Quotation Number</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {quotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{quotation.quotationNumber}</td>
                  <td className="px-4 py-3">{quotation.customerName}</td>
                  <td className="px-4 py-3">{formatDate(quotation.date)}</td>
                  <td className="px-4 py-3">{money(quotation.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleView(quotation.id)}
                        className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-600"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleEdit(quotation.id)}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownload(quotation.id)}
                        className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(quotation.id)}
                        disabled={deletingId === quotation.id}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {quotations.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No quotations saved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showEditor && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {mode === "create" ? "Create New Quotation" : mode === "edit" ? "Edit Quotation" : "View Quotation"}
            </h3>
            <div className="flex gap-2">
              {mode !== "view" && (
                <button
                  type="button"
                  onClick={() => void saveQuotation()}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Save Quotation
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDownloadCurrent()}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("none");
                  setForm(emptyForm());
                }}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>

          <QuotationSheet
            form={{ ...form, items: recalculateItems(form.items) }}
            readOnly={readOnly}
            onFieldChange={updateField}
            onItemChange={updateItem}
            onAddRow={addRow}
            onDeleteRow={deleteRow}
          />
        </div>
      )}

      <div className="fixed left-[-9999px] top-0 w-[1200px] bg-white z-[-1]">
        {pdfPreviewRecord && <div ref={pdfRef}><QuotationSheet form={mapRecordToForm(pdfPreviewRecord)} readOnly /></div>}
      </div>
    </section>
  );
};

export default AdminQuotation;
