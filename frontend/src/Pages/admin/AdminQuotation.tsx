import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { API_BASE_URL } from "../../api/api";
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
  createdAt?: string;
  updatedAt?: string;
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

type CustomerOption = {
  key: string;
  name: string;
  contact: string;
  address: string;
  siteName: string;
  contactPerson: string;
};

const NEW_CUSTOMER_KEY = "__new__";

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
  units: "Per Cum",
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
      units: item.units || "Per Cum",
      quantity: normalizeNumber(item.quantity),
      unitPrice: normalizeNumber(item.unitPrice),
      totalPrice: normalizeNumber(item.totalPrice),
    })),
  ),
});

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
        element.style.setProperty(property, toCanvasSafeColor(resolved));
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
          const safeFallback = toCanvasSafeColor(value);
          if (safeFallback.includes("oklch(") || safeFallback.includes("oklab(")) {
            continue;
          }
          value = safeFallback;
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

  const tables = Array.from(captureNode.querySelectorAll<HTMLTableElement>(".quotation-table"));
  for (const table of tables) {
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = "0";
  }

  const cells = Array.from(captureNode.querySelectorAll<HTMLElement>(".quotation-table th, .quotation-table td"));
  for (const cell of cells) {
    cell.style.verticalAlign = "middle";
  }

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

const QuotationSheet = ({
  form,
  readOnly,
  customerOptions,
  selectedCustomerKey,
  onCustomerSelect,
  onFieldChange,
  onItemChange,
  onAddRow,
  onDeleteRow,
}: {
  form: QuotationForm;
  readOnly: boolean;
  customerOptions?: CustomerOption[];
  selectedCustomerKey?: string;
  onCustomerSelect?: (customerKey: string) => void;
  onFieldChange?: (field: keyof Omit<QuotationForm, "items" | "id">, value: string) => void;
  onItemChange?: (rowKey: string, field: keyof QuotationItem, value: string | number) => void;
  onAddRow?: () => void;
  onDeleteRow?: (rowKey: string) => void;
}) => {
  const renderInlineField = (
    field: keyof Omit<QuotationForm, "items" | "id">,
    placeholder = "",
    type: "text" | "date" = "text",
    className = "",
  ) => {
    if (readOnly) {
      return (
        <span className={`quotation-inline-field inline-flex h-[26px] min-w-[120px] flex-none items-end border-b border-black px-1 pb-[4px] leading-tight align-bottom ${className}`}>
          {form[field] || "-"}
        </span>
      );
    }

    return (
      <input
        type={type}
        value={form[field] || ""}
        onChange={(event) => onFieldChange?.(field, event.target.value)}
        placeholder={placeholder}
        className={`quotation-inline-field inline-block h-[26px] min-w-[120px] flex-none border-b border-black px-1 pb-[4px] pt-0 leading-tight align-bottom outline-none ${className}`}
      />
    );
  };

  return (
    <div className="quotation-print-root quotation-print-preview mx-auto w-[210mm] min-h-[297mm] bg-white font-[Arial,sans-serif] text-black text-[13px] leading-relaxed">
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

      <div className="quotation-row-split quotation-header-grid mb-5 mt-3 text-[12px]">
        <div className="quotation-row-left quotation-header-left space-y-3 font-normal">
          <p className="font-semibold">To,</p>
          {!readOnly && (
            <p>
              <select
                value={selectedCustomerKey || NEW_CUSTOMER_KEY}
                onChange={(event) => onCustomerSelect?.(event.target.value)}
                className="quotation-no-print w-[260px] rounded border border-gray-300 px-2 py-1 text-[11px]"
              >
                <option value={NEW_CUSTOMER_KEY}>New Customer</option>
                {(customerOptions || []).map((customer) => (
                  <option key={customer.key} value={customer.key}>
                    {customer.name || "Unnamed Customer"}
                  </option>
                ))}
              </select>
            </p>
          )}
          <p>{renderInlineField("customerName", "Customer name", "text", "w-[260px]")}</p>
          <p>{renderInlineField("address", "Address", "text", "w-[260px]")}</p>
        </div>

        <div className="quotation-row-right quotation-header-right space-y-2 text-right">
          <p>
            <span className="font-semibold">Qtn. No.:</span>{" "}
            <span className="font-normal">{renderInlineField("quotationNumber", "Quotation number", "text", "w-[180px]")}</span>
          </p>
          <p>
            <span className="font-semibold">Date:</span> <span className="font-normal">{renderInlineField("date", "", "date", "w-[120px]")}</span>
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-1.5 text-[12px] leading-[1.45]">
        <p>
          <span className="font-semibold">Kind Attn.</span> {renderInlineField("contactPerson", "Contact person", "text", "w-[290px]")}
        </p>
        <p>
          <span className="font-semibold">MO No.</span> {renderInlineField("contact", "Mobile number", "text", "w-[260px]")}
        </p>
        <p>
          <span className="font-semibold">Subject:</span> Quotation for Ready-Mix Concrete.
        </p>
        <p>
          <span className="font-semibold">Site Location:</span> {renderInlineField("siteName", "Site location", "text", "w-[260px]")}
        </p>
      </div>

      <div className="mb-5 text-[12px] leading-[1.55]">
        <p className="font-semibold">Dear Sir,</p>
        <p>
          With reference to your inquiry and discussed, we are pleased to give you our offer for the following grade of concrete. This quotation
          is made on and it&apos;s subject to the terms below.
        </p>
      </div>

      <div className="quotation-table-wrap overflow-hidden border border-black">
        <table className="quotation-table w-full text-[12px]">
          <thead>
            <tr className="bg-gray-100 font-semibold">
              <th className="border border-black px-2 py-2">Sr. No.</th>
              <th className="border border-black px-2 py-2">Grade of RMC</th>
              <th className="border border-black px-2 py-2">Unit</th>
              <th className="border border-black px-2 py-2">Rate (₹)</th>
              <th className="border border-black px-2 py-2">Remark</th>
              {!readOnly && <th className="border border-black px-2 py-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, index) => (
              <tr key={item.rowKey}>
                <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                <td className="border border-black px-2 py-1 text-center">
                  {readOnly ? (
                    <span>{item.grade || "-"}</span>
                  ) : (
                    <input
                      value={item.grade}
                      onChange={(event) => onItemChange?.(item.rowKey, "grade", event.target.value)}
                      className="w-full px-2 py-1 text-center outline-none"
                      placeholder="Grade"
                    />
                  )}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {readOnly ? (
                    <span>{item.units || "Per Cum"}</span>
                  ) : (
                    <input
                      value={item.units}
                      onChange={(event) => onItemChange?.(item.rowKey, "units", event.target.value)}
                      className="w-full px-2 py-1 text-center outline-none"
                    />
                  )}
                </td>
                <td className="border border-black px-2 py-1">
                  {readOnly ? (
                    <span className="block text-center">{item.unitPrice.toFixed(0)}/-</span>
                  ) : (
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={item.unitPrice}
                      onChange={(event) => {
                        onItemChange?.(item.rowKey, "unitPrice", Number(event.target.value));
                        onItemChange?.(item.rowKey, "quantity", 1);
                      }}
                      className="w-full px-2 py-1 text-center outline-none"
                    />
                  )}
                </td>
                <td className="border border-black px-2 py-1 text-center">100% W.sand</td>
                {!readOnly && (
                  <td className="border border-black px-2 py-1 text-center">
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
        <div className="mt-2">
          <button
            type="button"
            onClick={onAddRow}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Add Row
          </button>
        </div>
      )}

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
        </div>
      </div>

      <div className="mt-6 text-[12px] leading-[1.6]">
        <p>We hope you find the above quotation in line with your requirements. Please feel free to contact us for any queries.</p>
        <p className="mt-4">Looking forward to receive your valuable purchase order &amp; assuring you of our best services at all times.</p>
        <p className="mt-4">Thanking you,</p>
      </div>

      <div className="quotation-row-split mt-5 items-end">
        <div className="quotation-row-left text-[14px] font-semibold leading-snug">
          <p>M/s. RRY INFRA PVT. LTD.</p>
          <p className="text-[12px]">Contact Person:</p>
          <p className="text-[12px]">Ashish Jha - 7347430750</p>
        </div>
        <div className="quotation-row-right text-right">
          <img
            src="/iso-badge.png"
            alt="ISO 9001:2015 Certified"
            className="h-24 w-24 object-contain"
          />
        </div>
      </div>

      <div className="mt-8 border-y-2 border-blue-600 py-1.5 text-center text-[11px] font-semibold text-blue-800">
        <p>RMC Plant 1: Gat No.135/01, Naigaon Road, Brahmanwade, Sinnar, Nashik-422103.</p>
        <p>RMC Plant 2:1792, Adgaon, Jaulakedindori, Nashik, Maharashtra 422003.</p>
        <p>For Orders: +91 8530736867</p>
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
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string>(NEW_CUSTOMER_KEY);
  const visibleQuotationRef = useRef<HTMLDivElement | null>(null);
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
            units: "Per Cum",
            quantity: Number(row.quantity || 0),
            unitPrice: Number(row.unitPrice || 0),
            totalPrice: Number(row.totalPrice || 0),
          };
        }),
      ),
      createdAt: String(source.createdAt || ""),
      updatedAt: String(source.updatedAt || ""),
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

      setCustomerOptions((previous) => {
        const merged = new Map<string, CustomerOption>();
        for (const customer of previous) {
          merged.set(customer.key, customer);
        }

        for (const quotation of rows) {
          const customerName = (quotation.customerName || "").trim();
          if (!customerName) {
            continue;
          }
          const key = `qtn:${customerName.toLowerCase()}`;
          const existing = merged.get(key);
          merged.set(key, {
            key,
            name: customerName,
            contact: quotation.contact || existing?.contact || "",
            address: quotation.address || existing?.address || "",
            siteName: quotation.siteName || existing?.siteName || "",
            contactPerson: quotation.contactPerson || existing?.contactPerson || customerName,
          });
        }

        return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
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

  const loadCustomerOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`);
      const data = (await parseApiBody(response)) as unknown;
      if (!response.ok || !Array.isArray(data)) {
        return;
      }

      const options = data
        .map((entry) => {
          const row = entry as Record<string, unknown>;
          const name = String(row.name || "").trim();
          if (!name) {
            return null;
          }
          const number = String(row.number || "").trim();
          return {
            key: `usr:${name.toLowerCase()}`,
            name,
            contact: number,
            address: "",
            siteName: "",
            contactPerson: name,
          } as CustomerOption;
        })
        .filter((entry): entry is CustomerOption => Boolean(entry));

      setCustomerOptions((previous) => {
        const merged = new Map<string, CustomerOption>();
        for (const customer of previous) {
          merged.set(customer.key, customer);
        }
        for (const customer of options) {
          const existing = Array.from(merged.values()).find((value) => value.name.toLowerCase() === customer.name.toLowerCase());
          if (existing) {
            merged.set(existing.key, {
              ...existing,
              contact: existing.contact || customer.contact,
              contactPerson: existing.contactPerson || customer.contactPerson,
            });
          } else {
            merged.set(customer.key, customer);
          }
        }
        return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (error) {
      console.error("Unable to load customers for quotation dropdown", error);
    }
  };

  useEffect(() => {
    void loadCustomerOptions();
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
    setSelectedCustomerKey(NEW_CUSTOMER_KEY);
  };

  const handleView = async (id: number) => {
    try {
      setMessage("");
      const record = await fetchById(id);
      setForm(mapRecordToForm(record));
      setSelectedCustomerKey(NEW_CUSTOMER_KEY);
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
      setSelectedCustomerKey(NEW_CUSTOMER_KEY);
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
    if (field === "customerName") {
      setSelectedCustomerKey(NEW_CUSTOMER_KEY);
    }
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleCustomerSelect = (customerKey: string) => {
    setSelectedCustomerKey(customerKey);
    if (customerKey === NEW_CUSTOMER_KEY) {
      return;
    }

    const selected = customerOptions.find((customer) => customer.key === customerKey);
    if (!selected) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      customerName: selected.name || previous.customerName,
      contact: selected.contact || previous.contact,
      address: selected.address || previous.address,
      siteName: selected.siteName || previous.siteName,
      contactPerson: selected.contactPerson || selected.name || previous.contactPerson,
    }));
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

  const renderRecordToPdf = async (record: QuotationRecord, sourceNode?: HTMLDivElement | null) => {
    let source = sourceNode;

    if (!source) {
      setPdfPreviewRecord(record);

      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), 80);
      });

      source = pdfRef.current;
    }

    if (!source) {
      throw new Error("Unable to render quotation PDF");
    }

    const captureNode = preparePrintableClone(source);

    document.body.appendChild(captureNode);

    // Wait for images to load
    const images = Array.from(captureNode.querySelectorAll("img")) as HTMLImageElement[];
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          }),
      ),
    );

    try {
      const captureRect = captureNode.getBoundingClientRect();
      const captureWidth = Math.ceil(captureRect.width);
      const captureHeight = Math.ceil(Math.max(captureNode.scrollHeight, captureRect.height));

      const canvas = await html2canvas(captureNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (element) => {
          return (
            element.classList.contains("quotation-no-print") ||
            element.tagName === "SELECT" ||
            element.tagName === "BUTTON" ||
            (element.tagName === "INPUT" && element.getAttribute("type") === "button")
          );
        },
      });

      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = 16;
      const printableWidth = pdfWidth - pageMargin * 2;
      const printableHeight = pdfHeight - pageMargin * 2;

      const pageHeightInCanvasPx = Math.floor((printableHeight * canvas.width) / printableWidth);
      const minSliceHeightPx = Math.max(8, Math.floor((18 * canvas.width) / printableWidth));
      let pageStartY = 0;
      let isFirstPage = true;

      while (pageStartY < canvas.height) {
        const remainingHeight = canvas.height - pageStartY;
        if (remainingHeight <= minSliceHeightPx) {
          break;
        }

        const idealEndY = Math.min(pageStartY + pageHeightInCanvasPx, canvas.height);
        const pageEndY =
          idealEndY >= canvas.height
            ? canvas.height
            : findBestPageBreak(canvas, pageStartY, idealEndY, canvas.height);
        const sliceHeight = Math.max(1, pageEndY - pageStartY);

        if (sliceHeight <= minSliceHeightPx) {
          break;
        }

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const pageContext = pageCanvas.getContext("2d");
        if (!pageContext) {
          throw new Error("Unable to prepare PDF page");
        }

        pageContext.fillStyle = "#ffffff";
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageContext.drawImage(
          canvas,
          0,
          pageStartY,
          canvas.width,
          sliceHeight,
          0,
          0,
          pageCanvas.width,
          pageCanvas.height,
        );

        const pageImage = pageCanvas.toDataURL("image/png");
        const renderedPageHeight = (sliceHeight * printableWidth) / canvas.width;

        if (!isFirstPage) {
          pdf.addPage();
        }

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
        pdf.addImage(pageImage, "PNG", pageMargin, pageMargin, printableWidth, renderedPageHeight);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(1);
        pdf.rect(pageMargin, pageMargin, printableWidth, printableHeight);
        pageStartY = pageEndY;
        isFirstPage = false;
      }

      const safeNumber = record.quotationNumber.replace(/[\\/:*?"<>|\s]+/g, "-") || "quotation";
      pdf.save(`${safeNumber}.pdf`);
    } finally {
      captureNode.remove();
    }
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
      await renderRecordToPdf(tempRecord, visibleQuotationRef.current);
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
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Saved Quotations List</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs text-gray-700 sm:text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Quotation No.</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Customer</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Date</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Created</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Updated</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Amount</th>
                <th className="px-2 py-2 sm:px-4 sm:py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {quotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td className="px-2 py-2 font-medium text-gray-900 sm:px-4 sm:py-3">{quotation.quotationNumber}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 truncate">{quotation.customerName}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs">{formatDate(quotation.date)}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs text-gray-500">{quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("en-GB", { year: "2-digit", month: "short", day: "numeric" }) : "-"}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-xs text-gray-500">{quotation.updatedAt ? new Date(quotation.updatedAt).toLocaleDateString("en-GB", { year: "2-digit", month: "short", day: "numeric" }) : "-"}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium">{money(quotation.totalAmount)}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => void handleView(quotation.id)}
                        className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-600"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleEdit(quotation.id)}
                        className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownload(quotation.id)}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(quotation.id)}
                        disabled={deletingId === quotation.id}
                        className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {quotations.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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

          <div ref={visibleQuotationRef}>
            <QuotationSheet
              form={{ ...form, items: recalculateItems(form.items) }}
              readOnly={readOnly}
              customerOptions={customerOptions}
              selectedCustomerKey={selectedCustomerKey}
              onCustomerSelect={handleCustomerSelect}
              onFieldChange={updateField}
              onItemChange={updateItem}
              onAddRow={addRow}
              onDeleteRow={deleteRow}
            />
          </div>
        </div>
      )}

      <div className="fixed left-[-9999px] top-0 z-[-1] w-[794px] bg-white">
        {pdfPreviewRecord && (
          <div ref={pdfRef}>
            <QuotationSheet form={mapRecordToForm(pdfPreviewRecord)} readOnly />
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminQuotation;
