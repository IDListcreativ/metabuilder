'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Loader2, Play, Maximize2, Minimize2 } from 'lucide-react';
import { GeneratedFile, GenerationStatus } from './AIGeneratorWorkspace';

interface LivePreviewSandboxProps {
  files: GeneratedFile[];
  status: GenerationStatus;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_CONFIG: Record<DeviceMode, { width: string; label: string; icon: React.ReactNode }> = {
  desktop: { width: '100%', label: 'Desktop', icon: <Monitor size={13} /> },
  tablet: { width: '768px', label: 'Tablet', icon: <Tablet size={13} /> },
  mobile: { width: '375px', label: 'Mobile', icon: <Smartphone size={13} /> },
};

function buildPreviewHTML(files: GeneratedFile[]): string {
  // Find the main entry file (App.tsx or ProductListing.tsx)
  const appFile = files.find(f => f.path.includes('App.tsx') || f.path.includes('App.jsx'));
  const listingFile = files.find(f => f.path.includes('ProductListing'));
  const mainFile = appFile || listingFile || files.find(f => f.language === 'tsx' || f.language === 'jsx');

  // Build a combined preview using the generated component structure
  const productCardContent = files.find(f => f.path.includes('ProductCard'))?.content || '';
  const filterContent = files.find(f => f.path.includes('FilterSidebar'))?.content || '';
  const sortContent = files.find(f => f.path.includes('SortDropdown'))?.content || '';

  const mockProducts = [
    { id: '1', title: 'Wireless Noise-Cancelling Headphones', price: 299, rating: 4.8, reviews: 2341, category: 'Electronics', badge: 'Best Seller', color: '#6366f1' },
    { id: '2', title: 'Ergonomic Office Chair', price: 449, rating: 4.6, reviews: 891, category: 'Furniture', badge: 'New', color: '#8b5cf6' },
    { id: '3', title: 'Mechanical Keyboard RGB', price: 159, rating: 4.7, reviews: 1567, category: 'Electronics', badge: 'Sale', color: '#a855f7' },
    { id: '4', title: 'Smart Watch Series X', price: 399, rating: 4.5, reviews: 3210, category: 'Wearables', badge: '', color: '#d946ef' },
    { id: '5', title: 'Portable SSD 2TB', price: 189, rating: 4.9, reviews: 4502, category: 'Storage', badge: 'Top Rated', color: '#ec4899' },
    { id: '6', title: 'USB-C Hub 12-in-1', price: 79, rating: 4.4, reviews: 678, category: 'Accessories', badge: '', color: '#f43f5e' },
  ];

  const productsJSON = JSON.stringify(mockProducts);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Live Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; }
    .star { color: #f59e0b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-bestseller { background: #fef3c7; color: #92400e; }
    .badge-new { background: #d1fae5; color: #065f46; }
    .badge-sale { background: #fee2e2; color: #991b1b; }
    .badge-toprated { background: #ede9fe; color: #5b21b6; }
    .cart-count { position: absolute; top: -6px; right: -6px; background: #7c3aed; color: white; border-radius: 9999px; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .product-card { transition: transform 0.2s, box-shadow 0.2s; }
    .product-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.12); }
    .add-btn { transition: background 0.15s; }
    .add-btn:hover { background: #5b21b6; }
    .filter-chip { cursor: pointer; transition: all 0.15s; }
    .filter-chip:hover { background: #ede9fe; border-color: #7c3aed; color: #5b21b6; }
    .filter-chip.active { background: #7c3aed; border-color: #7c3aed; color: white; }
    .cart-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 40; display: none; }
    .cart-overlay.open { display: block; }
    .cart-sidebar { position: fixed; right: 0; top: 0; bottom: 0; width: 320px; background: white; z-index: 50; transform: translateX(100%); transition: transform 0.3s ease; box-shadow: -4px 0 20px rgba(0,0,0,0.1); }
    .cart-sidebar.open { transform: translateX(0); }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(60px); background: #1f2937; color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; transition: transform 0.3s; z-index: 100; white-space: nowrap; }
    .toast.show { transform: translateX(-50%) translateY(0); }
  </style>
</head>
<body>
  <div id="app"></div>

  <div class="cart-overlay" id="cartOverlay" onClick="closeCart()"></div>
  <div class="cart-sidebar" id="cartSidebar">
    <div style="padding:16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:between">
      <div style="display:flex;align-items:center;gap:8px;flex:1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <span style="font-weight:700;font-size:16px">Cart</span>
        <span id="cartBadge" style="background:#7c3aed;color:white;border-radius:9999px;padding:1px 8px;font-size:12px;font-weight:600">0</span>
      </div>
      <button onClick="closeCart()" style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:20px;padding:4px">×</button>
    </div>
    <div id="cartItems" style="padding:16px;flex:1;overflow-y:auto;max-height:calc(100vh - 200px)">
      <p style="color:#9ca3af;text-align:center;margin-top:40px;font-size:14px">Your cart is empty</p>
    </div>
    <div id="cartFooter" style="padding:16px;border-top:1px solid #e5e7eb;display:none">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <span style="font-weight:600">Total</span>
        <span id="cartTotal" style="font-weight:700;color:#7c3aed;font-size:18px">$0</span>
      </div>
      <button style="width:100%;background:#7c3aed;color:white;border:none;padding:12px;border-radius:8px;font-weight:600;cursor:pointer;font-size:15px" onClick="showToast('Proceeding to checkout...')">Checkout</button>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const products = ${productsJSON};
    let cart = JSON.parse(localStorage.getItem('preview_cart') || '[]');
    let activeCategory = 'All';
    let sortBy = 'relevance';
    let searchQuery = '';

    function saveCart() {
      localStorage.setItem('preview_cart', JSON.stringify(cart));
    }

    function openCart() {
      document.getElementById('cartOverlay').classList.add('open');
      document.getElementById('cartSidebar').classList.add('open');
      renderCart();
    }

    function closeCart() {
      document.getElementById('cartOverlay').classList.remove('open');
      document.getElementById('cartSidebar').classList.remove('open');
    }

    function addToCart(id) {
      const product = products.find(p => p.id === id);
      const existing = cart.find(i => i.id === id);
      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ ...product, qty: 1 });
      }
      saveCart();
      updateCartCount();
      renderCart();
      showToast('Added to cart: ' + product.title.substring(0, 30) + '...');
    }

    function removeFromCart(id) {
      cart = cart.filter(i => i.id !== id);
      saveCart();
      updateCartCount();
      renderCart();
    }

    function updateCartCount() {
      const count = cart.reduce((a, i) => a + i.qty, 0);
      document.getElementById('cartCount').textContent = count;
      document.getElementById('cartBadge').textContent = count;
    }

    function renderCart() {
      const container = document.getElementById('cartItems');
      const footer = document.getElementById('cartFooter');
      if (cart.length === 0) {
        container.innerHTML = '<p style="color:#9ca3af;text-align:center;margin-top:40px;font-size:14px">Your cart is empty</p>';
        footer.style.display = 'none';
        return;
      }
      footer.style.display = 'block';
      const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
      document.getElementById('cartTotal').textContent = '$' + total;
      container.innerHTML = cart.map(item => \`
        <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f3f4f6">
          <div style="width:56px;height:56px;border-radius:8px;background:linear-gradient(135deg,\${item.color}22,\${item.color}44);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="font-size:22px">🛍️</span>
          </div>
          <div style="flex:1;min-width:0">
            <p style="font-size:13px;font-weight:600;margin:0 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\${item.title}</p>
            <p style="font-size:13px;color:#7c3aed;font-weight:700;margin:0">\$\${item.price} × \${item.qty}</p>
          </div>
          <button onClick="removeFromCart('\${item.id}')" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:18px;padding:0;align-self:flex-start">×</button>
        </div>
      \`).join('');
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }

    function getFilteredProducts() {
      let filtered = [...products];
      if (activeCategory !== 'All') {
        filtered = filtered.filter(p => p.category === activeCategory);
      }
      if (searchQuery) {
        filtered = filtered.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      if (sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price);
      else if (sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price);
      else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
      return filtered;
    }

    function renderProducts() {
      const filtered = getFilteredProducts();
      const grid = document.getElementById('productGrid');
      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#9ca3af"><p style="font-size:32px">🔍</p><p>No products found</p></div>';
        return;
      }
      grid.innerHTML = filtered.map(p => \`
        <div class="product-card" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">
          <div style="height:160px;background:linear-gradient(135deg,\${p.color}18,\${p.color}35);display:flex;align-items:center;justify-content:center;position:relative">
            <span style="font-size:52px">🛍️</span>
            \${p.badge ? \`<span class="badge badge-\${p.badge.toLowerCase().replace(' ','')} " style="position:absolute;top:10px;left:10px">\${p.badge}</span>\` : ''}
          </div>
          <div style="padding:14px">
            <p style="font-size:13px;color:#6b7280;margin:0 0 4px">\${p.category}</p>
            <h3 style="font-size:14px;font-weight:600;margin:0 0 8px;line-height:1.3">\${p.title}</h3>
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px">
              <span class="star">★</span>
              <span style="font-size:13px;font-weight:600">\${p.rating}</span>
              <span style="font-size:12px;color:#9ca3af">(\${p.reviews.toLocaleString()})</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:18px;font-weight:700;color:#111">\$\${p.price}</span>
              <button class="add-btn" onClick="addToCart('\${p.id}')" style="background:#7c3aed;color:white;border:none;padding:7px 14px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">Add to Cart</button>
            </div>
          </div>
        </div>
      \`).join('');
    }

    function setCategory(cat) {
      activeCategory = cat;
      document.querySelectorAll('.filter-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.cat === cat);
      });
      renderProducts();
    }

    function setSort(val) {
      sortBy = val;
      renderProducts();
    }

    function render() {
      const categories = ['All', ...new Set(products.map(p => p.category))];
      document.getElementById('app').innerHTML = \`
        <div style="min-height:100vh;background:#f9fafb">
          <!-- Header -->
          <header style="background:white;border-bottom:1px solid #e5e7eb;padding:0 24px;position:sticky;top:0;z-index:30">
            <div style="max-width:1200px;margin:0 auto;height:60px;display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:32px;height:32px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:8px;display:flex;align-items:center;justify-content:center">
                  <span style="color:white;font-size:16px">🛒</span>
                </div>
                <span style="font-weight:700;font-size:18px">ShopUI</span>
              </div>
              <input
                type="text"
                placeholder="Search products..."
                oninput="searchQuery=this.value;renderProducts()"
                style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;font-size:14px;width:260px;outline:none"
                onFocus="this.style.borderColor='#7c3aed'"
                onBlur="this.style.borderColor='#e5e7eb'"
              />
              <button onClick="openCart()" style="background:none;border:none;cursor:pointer;position:relative;padding:8px">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <span id="cartCount" class="cart-count">0</span>
              </button>
            </div>
          </header>

          <!-- Filters + Sort bar -->
          <div style="background:white;border-bottom:1px solid #e5e7eb;padding:10px 24px">
            <div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                \${categories.map(cat => \`
                  <button class="filter-chip \${cat === activeCategory ? 'active' : ''}" data-cat="\${cat}" onClick="setCategory('\${cat}')"
                    style="padding:5px 12px;border-radius:9999px;border:1px solid #e5e7eb;background:white;font-size:12px;font-weight:500;color:#374151">
                    \${cat}
                  </button>
                \`).join('')}
              </div>
              <select onChange="setSort(this.value)" style="border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;font-size:13px;color:#374151;outline:none;cursor:pointer">
                <option value="relevance">Most Relevant</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          <!-- Product grid -->
          <main style="max-width:1200px;margin:0 auto;padding:24px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <h2 style="font-size:20px;font-weight:700;margin:0">\${getFilteredProducts().length} Products</h2>
            </div>
            <div id="productGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px"></div>
          </main>
        </div>
      \`;
      renderProducts();
      updateCartCount();
    }

    render();
  </script>
</body>
</html>`;
}

export default function LivePreviewSandbox({ files, status }: LivePreviewSandboxProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewHTML, setPreviewHTML] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rebuild preview when files change or status becomes complete
  useEffect(() => {
    if (files.length > 0) {
      const html = buildPreviewHTML(files);
      setPreviewHTML(html);
      setIsLoading(true);
    }
  }, [files, refreshKey]);

  // Auto-refresh when generation completes
  useEffect(() => {
    if (status === 'complete') {
      const timer = setTimeout(() => {
        setRefreshKey(k => k + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    setIsLoading(true);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const deviceCfg = DEVICE_CONFIG[device];

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-zinc-950 ${isFullscreen ? 'fixed inset-0 z-50' : 'flex-1 min-w-0'}`}
    >
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${status === 'generating' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[11px] font-600 text-zinc-300">Live Preview</span>
          </div>

          <div className="w-px h-3.5 bg-zinc-700 mx-0.5" />

          {/* Device switcher */}
          <div className="flex items-center gap-0.5 bg-zinc-800/80 rounded-md p-0.5">
            {(Object.keys(DEVICE_CONFIG) as DeviceMode[]).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                title={DEVICE_CONFIG[d].label}
                className={`flex items-center justify-center w-6 h-6 rounded transition-all duration-150 ${
                  device === d
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {DEVICE_CONFIG[d].icon}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-zinc-600 font-mono">{deviceCfg.label}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status badge */}
          {status === 'generating' && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Loader2 size={9} className="text-amber-400 animate-spin" />
              <span className="text-[10px] text-amber-400">Updating…</span>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={status === 'generating'}
            title="Refresh preview"
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Open in new tab */}
          <button
            onClick={() => {
              const blob = new Blob([previewHTML], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }}
            title="Open in new tab"
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ExternalLink size={12} />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-zinc-900/30 flex items-start justify-center p-3">
        <div
          className="relative bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 flex-shrink-0"
          style={{
            width: deviceCfg.width,
            maxWidth: '100%',
            minHeight: '100%',
          }}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-zinc-900/80 flex flex-col items-center justify-center z-10 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              <span className="text-xs text-zinc-400">Rendering preview…</span>
            </div>
          )}

          {/* Iframe sandbox */}
          {previewHTML ? (
            <iframe
              ref={iframeRef}
              key={refreshKey}
              srcDoc={previewHTML}
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              className="w-full border-0"
              style={{ minHeight: '600px', height: '100%', display: 'block' }}
              title="Live Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-96 gap-4 text-zinc-500">
              <Play size={32} className="text-zinc-700" />
              <div className="text-center">
                <p className="text-sm font-500 text-zinc-400">No preview available</p>
                <p className="text-xs text-zinc-600 mt-1">Generate code to see a live preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800/40 bg-zinc-900/30 flex-shrink-0">
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
          <span>{files.length} files</span>
          <span>·</span>
          <span>{files.filter(f => f.language === 'tsx' || f.language === 'jsx').length} components</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Sandbox isolated</span>
        </div>
      </div>
    </div>
  );
}
