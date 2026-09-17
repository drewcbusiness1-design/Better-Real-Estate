/* =========================================================================
   cj-adapter.js — CJdropshipping API 2.0 integration.

   Production setup:
     CJ_API_KEY=your API key from My CJ -> Apps -> API

   Security: CJ credentials and access tokens stay server-side. Never expose
   CJ_API_KEY or CJ-Access-Token to browser code.
   ========================================================================= */

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const REQUEST_TIMEOUT_MS = 15000;

function configured() {
  return !!String(process.env.CJ_API_KEY || '').trim();
}

let cached = null; // { accessToken, refreshToken, expiresAt }

function asErrorMessage(body, status) {
  const suffix = body?.requestId ? ` (request ${body.requestId})` : '';
  return `${body?.message || `HTTP ${status}`}${suffix}`;
}

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.result === false || body.success === false) {
      const err = new Error('CJdropshipping error: ' + asErrorMessage(body, res.status));
      err.status = res.status >= 400 && res.status < 500 ? 400 : 502;
      err.cj = body;
      throw err;
    }
    return body;
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error('CJdropshipping did not respond in time. Try again.');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken() {
  if (!configured()) throw new Error('CJdropshipping is not connected — set CJ_API_KEY.');
  if (cached?.accessToken && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.accessToken;

  const body = await requestJson(`${BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: String(process.env.CJ_API_KEY).trim() })
  });

  if (!body?.data?.accessToken) throw new Error('CJdropshipping did not return an access token.');
  cached = {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken || null,
    expiresAt: Number.isFinite(new Date(body.data.accessTokenExpiryDate).getTime())
      ? new Date(body.data.accessTokenExpiryDate).getTime()
      : Date.now() + 150 * 24 * 60 * 60 * 1000
  };
  return cached.accessToken;
}

async function cjCall(path, { method = 'GET', payload, headers = {} } = {}) {
  const token = await getAccessToken();
  const body = await requestJson(`${BASE}${path}`, {
    method,
    headers: {
      'CJ-Access-Token': token,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  return body.data;
}

function cleanHtml(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseInventory(variant) {
  const rows = Array.isArray(variant?.inventories) ? variant.inventories : [];
  return rows.map(r => ({
    countryCode: String(r.countryCode || '').toUpperCase(),
    totalInventory: Math.max(0, Number(r.totalInventory ?? r.cjInventory ?? r.factoryInventory ?? 0) || 0),
    verifiedWarehouse: Number(r.verifiedWarehouse || 0) || null
  }));
}

function normalizeVariant(v, product) {
  const inventories = parseInventory(v);
  const totalInventory = inventories.reduce((sum, row) => sum + row.totalInventory, 0);
  const preferred = inventories.find(r => r.countryCode === 'US' && r.totalInventory > 0)
    || inventories.find(r => r.countryCode === 'CN' && r.totalInventory > 0)
    || inventories.find(r => r.totalInventory > 0)
    || null;
  return {
    vid: v.vid,
    pid: v.pid || product?.pid,
    sku: v.variantSku || '',
    name: v.variantNameEn || v.variantName || product?.productNameEn || 'CJ product',
    option: v.variantKey || v.variantStandard || '',
    image: v.variantImage || product?.bigImage || product?.productImage || '',
    price: Number(v.variantSellPrice ?? product?.sellPrice ?? 0) || 0,
    suggestedPrice: Number(v.variantSugSellPrice || 0) || null,
    weight: Number(v.variantWeight || 0) || null,
    stock: totalInventory,
    inventories,
    fromCountryCode: preferred?.countryCode || 'CN'
  };
}

function normalizeProduct(p, includeVariants = false) {
  const product = {
    pid: p.pid || p.productId || p.id,
    sku: p.productSku || p.sku || '',
    name: p.productNameEn || p.nameEn || p.productName || p.name || 'CJ product',
    image: p.productImage || p.bigImage || p.bigimg || '',
    images: Array.isArray(p.productImageSet) ? p.productImageSet.filter(Boolean).slice(0, 6) : [],
    price: Number(p.sellPrice ?? p.sellprice ?? p.totalPrice ?? 0) || 0,
    categoryName: p.categoryName || p.category || '',
    description: cleanHtml(p.description || '').slice(0, 1800),
    listedNum: Number(p.listedNum || 0) || 0,
    freeShipping: p.isFreeShipping === true || p.addMarkStatus === 1,
    customizationVersion: p.customizationVersion || null,
    supplierName: p.supplierName || '',
    status: p.status ?? p.saleStatus ?? null
  };
  if (includeVariants) product.variants = (Array.isArray(p.variants) ? p.variants : []).map(v => normalizeVariant(v, p));
  return product;
}

async function searchProducts({ query = '', page = 1, size = 16, countryCode = '', freeShipping = false } = {}) {
  const qs = new URLSearchParams();
  qs.set('page', String(Math.min(1000, Math.max(1, Number(page) || 1))));
  qs.set('size', String(Math.min(50, Math.max(1, Number(size) || 16))));
  if (query) qs.set('keyWord', String(query).slice(0, 160));
  if (countryCode) qs.set('countryCode', String(countryCode).toUpperCase().slice(0, 2));
  if (freeShipping) qs.set('isFreeShipping', '1');
  const data = await cjCall(`/product/listV2?${qs.toString()}`);
  const list = data?.list || data?.content || [];
  return {
    page: Number(data?.pageNum ?? data?.page ?? data?.pageNumber ?? page) || 1,
    size: Number(data?.pageSize ?? data?.size ?? size) || size,
    total: Number(data?.total ?? data?.totalRecords ?? list.length) || list.length,
    products: list.map(p => normalizeProduct(p, false)).filter(p => p.pid)
  };
}

async function getProduct(pid, countryCode = '') {
  if (!pid) throw new Error('CJ product ID is required.');
  const qs = new URLSearchParams({ pid: String(pid) });
  if (countryCode) qs.set('countryCode', String(countryCode).toUpperCase().slice(0, 2));
  const data = await cjCall(`/product/query?${qs.toString()}`);
  return normalizeProduct(data || {}, true);
}

async function addToMyProduct(pid) {
  try {
    return await cjCall('/product/addToMyProduct', { method: 'POST', payload: { productId: pid } });
  } catch (err) {
    // CJ returns a business error if the product is already in My Products.
    if (/already|has been added to my products/i.test(err.message || '')) return true;
    throw err;
  }
}

function moneyValue(row) {
  const total = Number(row?.totalPostageFee);
  if (Number.isFinite(total)) return total;
  const logistic = Number(row?.logisticPrice ?? row?.shippingCost ?? 0);
  const taxes = Number(row?.taxesFee || 0);
  const clearance = Number(row?.clearanceOperationFee || 0);
  const n = logistic + taxes + clearance;
  return Number.isFinite(n) ? n : Infinity;
}

async function freightOptions({ vid, quantity = 1, fromCountryCode = 'CN', toCountryCode = 'US', zip = '' } = {}) {
  if (!vid) throw new Error('CJ variant ID is required for a freight quote.');
  const data = await cjCall('/logistic/freightCalculate', {
    method: 'POST',
    payload: {
      startCountryCode: String(fromCountryCode || 'CN').toUpperCase(),
      endCountryCode: String(toCountryCode || 'US').toUpperCase(),
      ...(zip ? { zip: String(zip).slice(0, 20) } : {}),
      products: [{ quantity: Math.max(1, Number(quantity) || 1), vid }]
    }
  });
  return (Array.isArray(data) ? data : [])
    .map(r => ({
      logisticName: r.logisticName || '',
      price: moneyValue(r),
      days: r.logisticAging || r.estimateDays || '',
      taxesFee: Number(r.taxesFee || 0) || 0,
      clearanceFee: Number(r.clearanceOperationFee || 0) || 0,
      totalPostageFee: Number(r.totalPostageFee ?? r.logisticPrice ?? 0) || 0
    }))
    .filter(r => r.logisticName && Number.isFinite(r.price))
    .sort((a, b) => a.price - b.price);
}

function normalizeShipping(sh = {}) {
  let state = String(sh.state || '').trim();
  let zip = String(sh.zip || '').trim();
  // Backward compatibility with older orders that stored "NJ 08520" in state.
  if (!zip) {
    const m = state.match(/^(.*?)[,\s]+(\d{5}(?:-\d{4})?)$/);
    if (m) { state = m[1].trim(); zip = m[2]; }
  }
  return {
    name: String(sh.name || '').trim(),
    line1: String(sh.line1 || '').trim(),
    line2: String(sh.line2 || '').trim(),
    city: String(sh.city || '').trim(),
    state,
    zip,
    phone: String(sh.phone || '').replace(/[^0-9+(). -]/g, '').trim(),
    country: String(sh.country || 'United States').trim(),
    countryCode: String(sh.countryCode || 'US').toUpperCase().slice(0, 2)
  };
}

async function placeOrder(supplierOrder) {
  const vid = supplierOrder.cjVid || supplierOrder.supplierSku;
  if (!vid) throw new Error('No CJ variant ID is saved on this product. Re-import it from the CJ catalog.');
  if (!supplierOrder.cjLogisticName) throw new Error('No CJ shipping method is saved. Re-quote shipping before creating the CJ order.');

  const sh = normalizeShipping(supplierOrder.shipping || {});
  if (!sh.line1 || !sh.city || !sh.state || !sh.countryCode) {
    throw new Error('The customer shipping address is incomplete. Street, city, state/province and country are required.');
  }

  const data = await cjCall('/shopping/order/createOrderV2', {
    method: 'POST',
    payload: {
      orderNumber: String(supplierOrder.orderId || supplierOrder.id).slice(0, 50),
      shippingZip: sh.zip,
      shippingCountryCode: sh.countryCode,
      shippingCountry: sh.country,
      shippingProvince: sh.state,
      shippingCity: sh.city,
      shippingPhone: sh.phone,
      shippingCustomerName: String(supplierOrder.buyerName || sh.name || 'Customer').slice(0, 50),
      shippingAddress: sh.line1,
      shippingAddress2: sh.line2,
      email: String(supplierOrder.buyerEmail || '').slice(0, 50),
      remark: 'Order via Better Real Estate marketplace',
      payType: 1,
      logisticName: supplierOrder.cjLogisticName,
      fromCountryCode: String(supplierOrder.cjFromCountryCode || 'CN').toUpperCase(),
      orderFlow: 1,
      products: [{
        vid,
        quantity: Math.max(1, Number(supplierOrder.qty) || 1),
        storeLineItemId: String(supplierOrder.id || supplierOrder.orderId).slice(0, 125)
      }]
    }
  });

  return {
    cjOrderId: data?.orderId || data?.cjOrderId || null,
    cjPayUrl: data?.cjPayUrl || null,
    orderAmount: Number(data?.orderAmount ?? data?.actualPayment ?? 0) || null,
    postageAmount: Number(data?.postageAmount ?? 0) || null,
    status: data?.orderStatus || null,
    raw: data
  };
}

async function getOrderStatus(cjOrderId) {
  if (!cjOrderId) return null;
  const data = await cjCall(`/shopping/order/getOrderDetail?orderId=${encodeURIComponent(cjOrderId)}`);
  if (!data) return null;
  return {
    status: data.orderStatus || data.status || null,
    subStatus: data.subStatus || null,
    trackingNumber: data.trackNumber || data.trackingNumber || null,
    trackingProvider: data.trackingProvider || null,
    trackingUrl: data.trackingUrl || null,
    logisticName: data.logisticName || null,
    postageAmount: Number(data.postageAmount || 0) || null,
    orderAmount: Number(data.orderAmount || 0) || null,
    raw: data
  };
}

module.exports = {
  configured,
  getAccessToken,
  searchProducts,
  getProduct,
  addToMyProduct,
  freightOptions,
  normalizeShipping,
  placeOrder,
  getOrderStatus,
  // Exposed only for deterministic unit tests.
  _normalizeProduct: normalizeProduct,
  _normalizeVariant: normalizeVariant
};
