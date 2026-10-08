# Inventory Manager

Open `inventory.html` with a static web server. The existing `index.html` and all Barista Mode files are unchanged. Inventory Manager currently has a separate entry point to respect that boundary.

Run simulation checks with `node --test inventory-engine.test.js`.

Each 3 seconds advances one café minute, for a 60-minute shift. Pause stops the clock; help pauses advancement while open. Orders use a fixed $250 purchasing allocation, independent of revenue. Ingredients are recipe portions. Recipes consume stock atomically and use earliest-expiring batches first. Orders cannot arrive at or after closing.

Suppliers trade cost, lead time, freshness, and sale quality. Lower-quality inputs reduce sale revenue. Shelf life starts at receipt and scales with supplier quality. Opening stock is valued at standard cost. Profit deducts consumed ingredients, expired inventory, and holding cost; unused stock remains an asset. Purchasing cash flow is reported separately. Demand estimates include lost orders, so stockouts do not artificially lower forecasts.

The score combines service rate (60%), waste avoidance (20%), and profit (20%, capped at $200). Menu prices above the reference price reduce purchase acceptance. Score and demand rules are educational assumptions, not calibrated business forecasts.

Staff management is deferred because it was tentative in the requested scope. The initial game focuses on purchasing, supplier selection, forecasting, pricing, and inventory economics.
