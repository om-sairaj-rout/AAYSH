import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Truck,
  X,
} from "lucide-react";
import { toast } from "../utils/toast";
import { useConfirm } from "../components/ConfirmDialog";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/productsAPI";
import { createOrder } from "../api/ordersAPI";
import { getCompanies } from "../api/companyAPI";
import { canAccess, hasGlobalDataAccess } from "../utils/permissions";

const emptyProduct = {
  name: "",
  sku: "",
  description: "",
  sellingPrice: "",
  discount: "",
  tax: "",
  hsn: "",
  weight: "",
  length: "",
  breadth: "",
  height: "",
  defaultUnits: "1",
};

const emptyShipForm = {
  billing_customer_name: "",
  billing_phone: "",
  billing_email: "",
  billing_address: "",
  billing_city: "",
  billing_state: "",
  billing_pincode: "",
  payment_method: "COD",
  pickup_location: "",
};

const ProductCatalogPage = () => {
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const hasGlobalAccess = hasGlobalDataAccess(user);
  const canWrite = canAccess(user, "orders", "write");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const [companiesList, setCompaniesList] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [submitting, setSubmitting] = useState(false);

  const [shipOpen, setShipOpen] = useState(false);
  const [shipForm, setShipForm] = useState(emptyShipForm);
  const [selectedIds, setSelectedIds] = useState([]);
  const [itemQty, setItemQty] = useState({});

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts({
        search: searchQuery || undefined,
        companyId: hasGlobalAccess ? selectedCompany : undefined,
      });
      setProducts(res.products || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasGlobalAccess) return;
    getCompanies()
      .then((res) => {
        if (res.success) setCompaniesList(res.companies || []);
      })
      .catch(() => {});
  }, [hasGlobalAccess]);

  useEffect(() => {
    loadProducts();
  }, [searchQuery, selectedCompany, hasGlobalAccess]);

  useEffect(() => {
    if (user && !shipForm.pickup_location) {
      const pickup = [user.address, user.city, user.state, user.zip_code]
        .filter(Boolean)
        .join(", ");
      setShipForm((prev) => ({ ...prev, pickup_location: pickup }));
    }
  }, [user, shipForm.pickup_location]);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.includes(p._id)),
    [products, selectedIds]
  );

  const openCreate = () => {
    if (hasGlobalAccess && selectedCompany === "ALL") {
      toast.validation("Select a company before adding a product");
      return;
    }
    setEditingProduct(null);
    setForm(emptyProduct);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      sellingPrice: String(product.sellingPrice ?? ""),
      discount: String(product.discount ?? ""),
      tax: String(product.tax ?? ""),
      hsn: product.hsn || "",
      weight: String(product.weight ?? ""),
      length: String(product.length ?? ""),
      breadth: String(product.breadth ?? ""),
      height: String(product.height ?? ""),
      defaultUnits: String(product.defaultUnits ?? 1),
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const taxPercent = Number(form.tax) || 0;
    if (taxPercent < 0 || taxPercent > 100) {
      toast.validation("Tax must be between 0 and 100%");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name: form.name,
        sku: form.sku,
        description: form.description,
        sellingPrice: Number(form.sellingPrice) || 0,
        discount: Number(form.discount) || 0,
        tax: taxPercent,
        hsn: form.hsn,
        weight: Number(form.weight) || 0,
        length: Number(form.length) || 0,
        breadth: Number(form.breadth) || 0,
        height: Number(form.height) || 0,
        defaultUnits: Number(form.defaultUnits) || 1,
        ...(hasGlobalAccess && selectedCompany !== "ALL"
          ? { companyID: selectedCompany }
          : {}),
      };

      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product added to catalog");
      }

      setModalOpen(false);
      await loadProducts();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const confirmed = await confirm({
      title: "Remove product",
      message: `Remove "${product.name}" from catalog?`,
      confirmLabel: "Remove",
      cancelLabel: "Keep product",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteProduct(product._id);
      toast.success("Product removed");
      setSelectedIds((prev) => prev.filter((id) => id !== product._id));
      await loadProducts();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setItemQty((prev) => ({
      ...prev,
      [id]: prev[id] || products.find((p) => p._id === id)?.defaultUnits || 1,
    }));
  };

  const openShip = () => {
    if (selectedProducts.length === 0) {
      toast.validation("Select at least one product to ship");
      return;
    }
    const qtyMap = {};
    selectedProducts.forEach((p) => {
      qtyMap[p._id] = itemQty[p._id] || p.defaultUnits || 1;
    });
    setItemQty(qtyMap);
    setShipOpen(true);
  };

  const handleShip = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const orderItems = selectedProducts.map((product) => ({
        name: product.name,
        sku: product.sku,
        units: Number(itemQty[product._id]) || product.defaultUnits || 1,
        selling_price: product.sellingPrice || 0,
        discount: product.discount || 0,
        tax: product.tax || 0,
        hsn: product.hsn || "",
      }));

      const totalWeight = selectedProducts.reduce((sum, product) => {
        const units = Number(itemQty[product._id]) || 1;
        return sum + (Number(product.weight) || 0) * units;
      }, 0);

      const maxLength = Math.max(...selectedProducts.map((p) => Number(p.length) || 0), 0);
      const maxBreadth = Math.max(...selectedProducts.map((p) => Number(p.breadth) || 0), 0);
      const maxHeight = selectedProducts.reduce((sum, product) => {
        const units = Number(itemQty[product._id]) || 1;
        return sum + (Number(product.height) || 0) * units;
      }, 0);

      const companyIds = [...new Set(selectedProducts.map((p) => p.companyID))];
      if (companyIds.length > 1) {
        toast.validation("Selected products must belong to the same company");
        return;
      }

      const shipCompanyId = companyIds[0];
      const shipCompany = companiesList.find((c) => c.companyID === shipCompanyId);

      const payload = {
        order_id: `CAT-${Date.now()}`,
        company_id: shipCompanyId,
        consignor_name: shipCompany?.companyName || user?.companyName || "",
        pickup_location: shipForm.pickup_location,
        billing_customer_name: shipForm.billing_customer_name,
        billing_phone: shipForm.billing_phone,
        billing_email: shipForm.billing_email,
        billing_address: shipForm.billing_address,
        billing_city: shipForm.billing_city,
        billing_state: shipForm.billing_state,
        billing_pincode: shipForm.billing_pincode,
        billing_country: "India",
        payment_method: shipForm.payment_method,
        order_items: orderItems,
        weight: totalWeight,
        length: maxLength,
        breadth: maxBreadth,
        height: maxHeight,
      };

      const res = await createOrder(payload);
      toast.success(`Order ${res.order_id} created successfully`);
      setShipOpen(false);
      setSelectedIds([]);
      navigate("/reports/all-orders");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page bg-[#EFF2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B] flex items-center gap-2">
            <Package size={24} />
            Product Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Save product details once and reuse them when creating shipments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={openShip}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1B2B4B] text-white px-4 py-2.5 text-sm font-bold"
            >
              <Truck size={16} />
              Ship Selected ({selectedIds.length})
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-bold"
            >
              <Plus size={16} />
              Add Product
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, SKU..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
          />
        </div>
        {hasGlobalAccess && (
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1B2B4B]"
          >
            <option value="ALL">All Companies</option>
            {companiesList.map((company) => (
              <option key={company.companyID} value={company.companyID}>
                {company.companyName} ({company.companyID})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-[22px] shadow-sm border border-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-[#FAFBFC] border-b border-slate-100">
                {canWrite && <th className="px-4 py-4 w-10" />}
                <th className="px-4 py-4">Product</th>
                <th className="px-4 py-4">SKU</th>
                <th className="px-4 py-4 text-right">Price</th>
                <th className="px-4 py-4 text-right">Tax</th>
                <th className="px-4 py-4">Weight (g)</th>
                <th className="px-4 py-4">L × W × H (cm)</th>
                <th className="px-4 py-4">HSN</th>
                {canWrite && <th className="px-4 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={canWrite ? 9 : 7} className="px-6 py-12 text-center text-slate-400">
                    Loading catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 9 : 7} className="px-6 py-12 text-center text-slate-400">
                    No products in catalog yet.
                    {canWrite && " Click Add Product to get started."}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50/70">
                    {canWrite && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product._id)}
                          onChange={() => toggleSelect(product._id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#1B2B4B]">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {product.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-600">
                      {product.sku || "-"}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-[#1B2B4B]">
                      ₹{Number(product.sellingPrice || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">
                      {Number(product.tax || 0)}%
                    </td>
                    <td className="px-4 py-4 text-slate-600">{product.weight || 0}</td>
                    <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                      {product.length || 0} × {product.breadth || 0} × {product.height || 0}
                    </td>
                    <td className="px-4 py-4 text-slate-500">{product.hsn || "-"}</td>
                    {canWrite && (
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="p-2 rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="p-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#1B2B4B]">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  placeholder="Product name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm md:col-span-2"
                />
                <input
                  placeholder="SKU"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  placeholder="HSN code"
                  value={form.hsn}
                  onChange={(e) => setForm({ ...form, hsn: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Selling price (₹)"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Discount (₹)"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Tax (%)"
                  value={form.tax}
                  onChange={(e) => setForm({ ...form, tax: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                  title="GST / tax rate as a percentage of price after discount"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Default units"
                  value={form.defaultUnits}
                  onChange={(e) => setForm({ ...form, defaultUnits: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Weight (grams)"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Length (cm)"
                  value={form.length}
                  onChange={(e) => setForm({ ...form, length: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Width / Breadth (cm)"
                  value={form.breadth}
                  onChange={(e) => setForm({ ...form, breadth: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Height (cm)"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <textarea
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm md:col-span-2 min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-[#1B2B4B] text-white text-sm font-bold disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingProduct ? "Update" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {shipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-[#1B2B4B]">Ship from Catalog</h2>
              <button type="button" onClick={() => setShipOpen(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleShip} className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Selected products</p>
                {selectedProducts.map((product) => (
                  <div key={product._id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[#1B2B4B]">{product.name}</span>
                    <input
                      type="number"
                      min="1"
                      value={itemQty[product._id] || 1}
                      onChange={(e) =>
                        setItemQty({ ...itemQty, [product._id]: e.target.value })
                      }
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  placeholder="Customer name *"
                  value={shipForm.billing_customer_name}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, billing_customer_name: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  required
                  placeholder="Phone (optional)"
                  value={shipForm.billing_phone}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, billing_phone: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={shipForm.billing_email}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, billing_email: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <select
                  value={shipForm.payment_method}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, payment_method: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                >
                  <option value="COD">COD</option>
                  <option value="Prepaid">Prepaid</option>
                </select>
                <input
                  required
                  placeholder="Address *"
                  value={shipForm.billing_address}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, billing_address: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm md:col-span-2"
                />
                <input
                  required
                  placeholder="City *"
                  value={shipForm.billing_city}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, billing_city: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  required
                  placeholder="State *"
                  value={shipForm.billing_state}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, billing_state: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  required
                  placeholder="Pincode *"
                  value={shipForm.billing_pincode}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, billing_pincode: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                />
                <input
                  required
                  placeholder="Pickup location *"
                  value={shipForm.pickup_location}
                  onChange={(e) =>
                    setShipForm({ ...shipForm, pickup_location: e.target.value })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm md:col-span-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShipOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2B4B] text-white text-sm font-bold disabled:opacity-50"
                >
                  <Truck size={16} />
                  {submitting ? "Creating..." : "Create Shipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalogPage;
