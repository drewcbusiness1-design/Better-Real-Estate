# CJdropshipping integration

This build uses CJdropshipping API 2.0 entirely from the server. The browser never receives your CJ API key or access token.

## 1. Add the API key

In CJdropshipping: **My CJ → Apps → Install App → API → Add API**. Copy the API key.

In Netlify: **Site configuration → Environment variables**:

```text
CJ_API_KEY = your_full_cj_api_key
```

Redeploy after adding the variable.

## 2. Connect it inside Better Real Estate

1. Sign in as the allowlisted admin account.
2. Open **Profile → Admin — suppliers**.
3. Add a supplier named `CJdropshipping` and choose **CJdropshipping** as the type.
4. Click **Import catalog** on that supplier.
5. Use **CJdropshipping catalog** to search CJ directly.
6. Open a product's variants and click **Review** on the exact variant you want to sell.
7. The review screen auto-fills CJ cost, a suggested retail price, title, marketplace category, description, photos, SKU, stock, warehouse, weight and dimensions. Adjust anything you want, then click **Publish to Marketplace**.

Publishing from the CJ browser automatically stores the real CJ product ID (PID), variant ID (VID), variant SKU, barcode, current supplier cost, stock/origin, product photos and physical metadata. It also adds the product to **My Products** on CJ when needed. CJ freight remains live at customer checkout and is not baked into the item price.

## 3. What happens when a buyer purchases

For a CJ item, the buyer enters street, city, state and ZIP before checkout. The server asks CJ for live freight options, selects the lowest currently available quote, shows that shipping charge to the buyer and includes it in the checkout total.

The server checks the freight again before charging. If CJ changes the amount between the preview and checkout, the purchase stops and asks the buyer to review the new total rather than silently charging a different amount.

After payment, the order lands in **Profile → Admin — fulfilment queue** with the CJ VID, shipping method, quoted freight, destination and current gross profit.

## 4. Create the supplier order

In the fulfilment queue, click **Create on CJ**. The app re-quotes freight once more, shows the current supplier shipping cost/profit, then creates the CJ order using CJ's page-payment flow. It does **not** automatically spend your CJ balance.

If CJ returns a checkout URL, a **Pay on CJ** button appears next to the order. After paying CJ, use **Check CJ status** to sync order status and tracking. When tracking appears, Better Real Estate saves it and sends the existing shipped email to the buyer.

## 5. Operational notes

- Keep `CJ_API_KEY` only in Netlify environment variables or a local `.env`; never paste it into `public/app.js`.
- Freight is intentionally charged live rather than baked into the product price, because CJ shipping varies by variant and destination.
- Existing manual supplier imports still work; the CJ catalog browser is an additional path.
- The integration defaults to the cheapest freight option returned by CJ. If you later want buyers/admins to choose among speed-vs-price options, the server already returns the available option list.
- For regulated products (electrical, gas, potable-water contact, alarms, etc.), verify the applicable certification/compliance before listing. CJ catalog availability is not proof of U.S. regulatory compliance.
