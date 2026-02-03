
import React, { useEffect, useState, useMemo } from 'react';
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant
} from '../api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLang } from '../i18n';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const defaultCategoryOrder = ['protein', 'veg', 'frozen', 'dry', 'sauce', 'other'];

const loadCategoryOrder = () => {
    try {
        const stored = localStorage.getItem('m2go:categoryOrder');
        if (!stored) return defaultCategoryOrder;
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCategoryOrder;
    } catch (err) {
        return defaultCategoryOrder;
    }
};

const InputGroup = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

const StyledInput = (props) => (
    <input
        {...props}
        className={cn(
            "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-brand-red/30 focus:ring-2 focus:ring-brand-red/10 transition-all placeholder-gray-300",
            props.className
        )}
    />
);

const StyledSelect = (props) => (
    <div className="relative">
        <select
            {...props}
            className={cn(
                "w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 focus:outline-none focus:border-brand-red/30 focus:ring-2 focus:ring-brand-red/10 transition-all",
                props.className
            )}
        />
        <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-400 pointer-events-none text-lg">expand_more</span>
    </div>
);

function Products() {
    const { t, mode } = useLang();

    const categoryOptions = useMemo(
        () => ([
            { value: 'protein', label: t('蛋白', 'Protein') },
            { value: 'veg', label: t('蔬菜', 'Vegetable') },
            { value: 'frozen', label: t('冷冻', 'Frozen') },
            { value: 'dry', label: t('干货', 'Dry Goods') },
            { value: 'sauce', label: t('酱料', 'Sauce') },
            { value: 'other', label: t('其他', 'Other') }
        ]),
        [mode]
    );

    const storageOptions = useMemo(
        () => ([
            { value: 'room', label: t('常温', 'Room') },
            { value: 'chill', label: t('冷藏', 'Chilled') },
            { value: 'frozen', label: t('冷冻', 'Frozen') }
        ]),
        [mode]
    );

    const formOptions = useMemo(
        () => ([
            { value: 'RAW', label: t('生鲜', 'Raw') },
            { value: 'COOKED_CHILL', label: t('预炸冷藏', 'Pre-Cooked (Chill)') },
            { value: 'PREP_chunk', label: t('切块', 'Cut: Chunk') },
            { value: 'PREP_shred', label: t('切丝', 'Cut: Shred') },
            { value: 'PREP_dice', label: t('切丁', 'Cut: Dice') },
            { value: 'FROZEN', label: t('冷冻', 'Frozen') }
        ]),
        [mode]
    );

    const containerOptions = useMemo(
        () => ([
            { value: 'case', label: t('整箱', 'Case') },
            { value: 'bag', label: t('袋装', 'Bag') },
            { value: 'box_2inch', label: t('2寸盒', '2\" Box') },
            { value: 'box_4inch', label: t('4寸盒', '4\" Box') }
        ]),
        [mode]
    );

    const [products, setProducts] = useState([]);
    const [message, setMessage] = useState('');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [categoryOrder, setCategoryOrder] = useState(loadCategoryOrder);
    const [loadError, setLoadError] = useState('');

    const [newProduct, setNewProduct] = useState({
        name_zh: '',
        name_en: '',
        category: 'veg',
        storage_type: 'room',
        supplier: '',
        case_pack: '',
        min_order_qty: ''
    });

    const [newVariantByProduct, setNewVariantByProduct] = useState({});

    const categoryLabelMap = useMemo(
        () => Object.fromEntries(categoryOptions.map((o) => [o.value, o.label])),
        [categoryOptions]
    );
    const storageLabelMap = useMemo(
        () => Object.fromEntries(storageOptions.map((o) => [o.value, o.label])),
        [storageOptions]
    );

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('m2go:categoryOrder', JSON.stringify(categoryOrder));
        } catch (err) {
            console.error(err);
        }
    }, [categoryOrder]);

    useEffect(() => {
        if (products.length === 0) return;
        const categories = Array.from(new Set(products.map((p) => p.category)));
        const merged = [...categoryOrder];
        categories.forEach((cat) => {
            if (!merged.includes(cat)) merged.push(cat);
        });
        if (merged.length !== categoryOrder.length) {
            setCategoryOrder(merged);
        }
    }, [products, categoryOrder]);

    async function loadProducts() {
        try {
            setLoadError('');
            const data = await getProducts();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setLoadError(t('加载商品失败', 'Failed to load products.'));
            setProducts([]);
        }
    }

    const buildProductPayload = (product) => ({
        name_zh: product.name_zh,
        name_en: product.name_en,
        category: product.category,
        storage_type: product.storage_type,
        supplier: product.supplier || null,
        case_pack: product.case_pack ? parseFloat(product.case_pack) : null,
        min_order_qty: product.min_order_qty ? parseFloat(product.min_order_qty) : null,
        sort_order: Number.isFinite(product.sort_order) ? product.sort_order : null,
        is_active: product.is_active !== false
    });

    const handleCreateProduct = async () => {
        setMessage('');
        if (!newProduct.name_zh) {
            setMessage(t('请填写中文名', 'Chinese name required'));
            return;
        }
        try {
            const payload = {
                ...newProduct,
                case_pack: newProduct.case_pack ? parseFloat(newProduct.case_pack) : null,
                min_order_qty: newProduct.min_order_qty ? parseFloat(newProduct.min_order_qty) : null,
                supplier: newProduct.supplier || null,
                is_active: true
            };
            const created = await createProduct(payload);
            setProducts([...products, { ...created, variants: [] }]);
            setNewProduct({
                name_zh: '',
                name_en: '',
                category: 'veg',
                storage_type: 'room',
                supplier: '',
                case_pack: '',
                min_order_qty: ''
            });
            setMessage(t('商品已创建', 'Product created'));
        } catch (err) {
            console.error(err);
            setMessage(t('创建失败', 'Failed to create product'));
        }
    };

    const handleProductChange = (productId, field, value) => {
        setProducts(products.map((p) => (p.id === productId ? { ...p, [field]: value } : p)));
    };

    const handleSaveProduct = async (product) => {
        setMessage('');
        try {
            const payload = buildProductPayload(product);
            await updateProduct(product.id, payload);
            setMessage(t('已保存', 'Saved'));
        } catch (err) {
            console.error(err);
            setMessage(t('保存失败', 'Save failed'));
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm(t('确定删除该商品？', 'Are you sure you want to delete this product?'))) return;
        setMessage('');
        try {
            await deleteProduct(productId);
            setProducts(products.filter((p) => p.id !== productId));
            setMessage(t('已删除', 'Deleted'));
        } catch (err) {
            console.error(err);
            setMessage(t('删除失败', 'Delete failed'));
        }
    };

    const handleVariantChange = (productId, variantId, field, value) => {
        setProducts(
            products.map((p) => {
                if (p.id !== productId) return p;
                return {
                    ...p,
                    variants: p.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v))
                };
            })
        );
    };

    const handleSaveVariant = async (variant) => {
        try {
            const payload = {
                ...variant,
                conversion_to_base: variant.conversion_to_base !== '' ? parseFloat(variant.conversion_to_base) : null,
                sort_order: Number.isFinite(variant.sort_order) ? variant.sort_order : null,
                product_id: variant.product_id
            };
            await updateVariant(variant.id, payload);
            setMessage(t('规格已保存', 'Variant saved'));
        } catch (err) {
            console.error(err);
            setMessage(t('保存规格失败', 'Failed to save variant'));
        }
    };

    const handleDeleteVariant = async (productId, variantId) => {
        if (!window.confirm(t('删除该规格？', 'Delete this variant?'))) return;
        try {
            await deleteVariant(variantId);
            setProducts(
                products.map((p) =>
                    p.id === productId ? { ...p, variants: p.variants.filter((v) => v.id !== variantId) } : p
                )
            );
            setMessage(t('规格已删除', 'Variant deleted'));
        } catch (err) {
            console.error(err);
            setMessage(t('删除规格失败', 'Delete variant failed'));
        }
    };

    const handleNewVariantChange = (productId, field, value) => {
        setNewVariantByProduct({
            ...newVariantByProduct,
            [productId]: {
                ...newVariantByProduct[productId],
                [field]: value
            }
        });
    };

    const handleCreateVariant = async (productId) => {
        const draft = newVariantByProduct[productId];
        if (!draft || !draft.display_name_zh) {
            setMessage(t('请填写规格名称', 'Variant name required'));
            return;
        }

        try {
            const payload = {
                product_id: productId,
                form: draft.form || 'RAW',
                container: draft.container || 'bag',
                conversion_to_base: draft.conversion_to_base ? parseFloat(draft.conversion_to_base) : null,
                display_name_zh: draft.display_name_zh
            };
            const created = await createVariant(payload);
            setProducts(products.map((p) => (p.id === productId ? { ...p, variants: [...p.variants, created] } : p)));
            setNewVariantByProduct({ ...newVariantByProduct, [productId]: {} });
            setMessage(t('规格已添加', 'Variant added'));
        } catch (err) {
            console.error(err);
            setMessage(t('添加规格失败', 'Add variant failed'));
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (!search.trim()) return true;
            const keyword = search.trim().toLowerCase();
            const zh = (p.name_zh || '').toLowerCase();
            const en = (p.name_en || '').toLowerCase();
            return zh.includes(keyword) || en.includes(keyword);
        });
    }, [products, search]);

    const grouped = useMemo(() => {
        return filteredProducts.reduce((acc, p) => {
            acc[p.category] = acc[p.category] || [];
            acc[p.category].push(p);
            return acc;
        }, {});
    }, [filteredProducts]);

    const sortProducts = (list) =>
        [...list].sort((a, b) => {
            const aOrder = Number.isFinite(a.sort_order) ? a.sort_order : 9999;
            const bOrder = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (a.name_zh || '').localeCompare(b.name_zh || '', 'zh');
        });

    const moveCategory = (category, direction) => {
        const idx = categoryOrder.indexOf(category);
        if (idx === -1) return;
        const nextIdx = idx + direction;
        if (nextIdx < 0 || nextIdx >= categoryOrder.length) return;
        const next = [...categoryOrder];
        [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
        setCategoryOrder(next);
    };

    const moveProduct = async (category, productId, direction) => {
        if (search.trim()) return;
        const list = sortProducts(grouped[category] || []);
        const index = list.findIndex((p) => p.id === productId);
        const targetIndex = index + direction;
        if (index === -1 || targetIndex < 0 || targetIndex >= list.length) return;

        const current = list[index];
        const swap = list[targetIndex];
        const currentOrder = Number.isFinite(current.sort_order) ? current.sort_order : index + 1;
        const swapOrder = Number.isFinite(swap.sort_order) ? swap.sort_order : targetIndex + 1;

        const updated = products.map((p) => {
            if (p.id === current.id) return { ...p, sort_order: swapOrder };
            if (p.id === swap.id) return { ...p, sort_order: currentOrder };
            return p;
        });
        setProducts(updated);

        try {
            await Promise.all([
                updateProduct(current.id, buildProductPayload({ ...current, sort_order: swapOrder })),
                updateProduct(swap.id, buildProductPayload({ ...swap, sort_order: currentOrder }))
            ]);
        } catch (err) {
            console.error(err);
        }
    };

    const orderedCategories = [
        ...categoryOrder.filter((cat) => grouped[cat]),
        ...Object.keys(grouped).filter((cat) => !categoryOrder.includes(cat))
    ];

    const messageIsError = /fail|失败|error|错误/i.test(message);

    return (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] pb-20">
            <div className="neumorphic-inset rounded-[2.5rem] p-6 space-y-8">
                <div>
                    <span className="text-[10px] font-mono font-bold text-[#0f766e] tracking-[0.3em] uppercase block mb-1">
                        {t('系统数据库', 'System Database')}
                    </span>
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
                        {t('商品与规格', 'Master Inventory')}
                    </h2>
                    <p className="text-gray-500 font-serif italic mt-1">
                        {t('管理商品信息与规格配置', 'Manage products and variants.')}
                    </p>
                </div>

                <div className="relative group z-10">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400 group-focus-within:text-brand-red transition-colors">
                        search
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-brand-red/20 bg-white placeholder-gray-400 text-sm font-bold"
                        placeholder={t('搜索商品', 'Search products')}
                    />
                </div>

                {loadError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-bold">
                        {loadError}
                    </div>
                )}

                <div className="space-y-8">
                    {orderedCategories.map((cat) => (
                        <div key={cat} className="space-y-4">
                            <div className="flex items-end justify-between border-b-2 border-brand-red/10 pb-2">
                                <h3 className="text-xl font-black text-brand-red uppercase tracking-wide flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gray-400 text-lg">label</span>
                                    {categoryLabelMap[cat] || cat}
                                </h3>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => moveCategory(cat, -1)}
                                        disabled={categoryOrder.indexOf(cat) <= 0}
                                        className="w-8 h-8 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 flex items-center justify-center disabled:opacity-30"
                                    >
                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                    </button>
                                    <button
                                        onClick={() => moveCategory(cat, 1)}
                                        disabled={categoryOrder.indexOf(cat) >= categoryOrder.length - 1}
                                        className="w-8 h-8 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 flex items-center justify-center disabled:opacity-30"
                                    >
                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {sortProducts(grouped[cat] || []).map((product, index) => {
                                    const expanded = expandedId === product.id;
                                    const canMoveUp = index > 0 && !search.trim();
                                    const canMoveDown = index < (grouped[cat] || []).length - 1 && !search.trim();

                                    return (

                                        <div
                                            key={product.id}
                                            className={cn(
                                                "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                                                expanded
                                                    ? "border-brand-red ring-1 ring-brand-red shadow-lg"
                                                    : "border-gray-100 hover:border-gray-300 hover:shadow-md"
                                            )}
                                        >
                                            <div
                                                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                                                onClick={() => setExpandedId(expanded ? null : product.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={cn(
                                                            "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 transition-colors",
                                                            expanded
                                                                ? "bg-brand-red text-white shadow-md shadow-brand-red/30"
                                                                : "bg-gray-50 text-gray-500"
                                                        )}
                                                    >
                                                        {product.name_zh.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-lg leading-tight">
                                                            {product.name_zh}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                {product.name_en || t('无英文名', 'No English Name')}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                {storageLabelMap[product.storage_type] || product.storage_type}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-white bg-[#0f766e] border border-transparent px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                {t(`${product.variants.length} 个规格`, `${product.variants.length} Variants`)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => moveProduct(cat, product.id, -1)}
                                                        disabled={!canMoveUp}
                                                        className="w-8 h-8 rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 flex items-center justify-center disabled:opacity-30 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                    </button>
                                                    <button
                                                        onClick={() => moveProduct(cat, product.id, 1)}
                                                        disabled={!canMoveDown}
                                                        className="w-8 h-8 rounded-full border border-gray-200 hover:border-gray-300 text-gray-400 hover:text-gray-600 flex items-center justify-center disabled:opacity-30 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setExpandedId(expanded ? null : product.id)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                                            expanded
                                                                ? "bg-gray-100 text-gray-600"
                                                                : "bg-brand-red text-white shadow-md hover:shadow-lg shadow-brand-red/20"
                                                        )}
                                                    >
                                                        {expanded ? t('收起', 'Close') : t('编辑', 'Edit')}
                                                    </button>
                                                </div>
                                            </div>

                                            {expanded && (
                                                <div className="bg-gray-50/50 border-t border-gray-100 p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <InputGroup label={t('中文名', 'Chinese')}>
                                                            <StyledInput
                                                                value={product.name_zh}
                                                                onChange={(e) => handleProductChange(product.id, 'name_zh', e.target.value)}
                                                            />
                                                        </InputGroup>
                                                        <InputGroup label={t('英文名', 'English')}>
                                                            <StyledInput
                                                                value={product.name_en}
                                                                onChange={(e) => handleProductChange(product.id, 'name_en', e.target.value)}
                                                            />
                                                        </InputGroup>
                                                        <InputGroup label={t('分类', 'Category')}>
                                                            <StyledSelect
                                                                value={product.category}
                                                                onChange={(e) => handleProductChange(product.id, 'category', e.target.value)}
                                                            >
                                                                {categoryOptions.map((o) => (
                                                                    <option key={o.value} value={o.value}>
                                                                        {o.label}
                                                                    </option>
                                                                ))}
                                                            </StyledSelect>
                                                        </InputGroup>
                                                        <InputGroup label={t('存储', 'Storage')}>
                                                            <StyledSelect
                                                                value={product.storage_type}
                                                                onChange={(e) => handleProductChange(product.id, 'storage_type', e.target.value)}
                                                            >
                                                                {storageOptions.map((o) => (
                                                                    <option key={o.value} value={o.value}>
                                                                        {o.label}
                                                                    </option>
                                                                ))}
                                                            </StyledSelect>
                                                        </InputGroup>
                                                        <InputGroup label={t('整箱数量', 'Case Pack')}>
                                                            <StyledInput
                                                                type="number"
                                                                value={product.case_pack || ''}
                                                                onChange={(e) => handleProductChange(product.id, 'case_pack', e.target.value)}
                                                                placeholder={t('可选', 'Optional')}
                                                            />
                                                        </InputGroup>
                                                        <InputGroup label={t('最小订购', 'Min Order')}>
                                                            <StyledInput
                                                                type="number"
                                                                value={product.min_order_qty || ''}
                                                                onChange={(e) => handleProductChange(product.id, 'min_order_qty', e.target.value)}
                                                                placeholder={t('可选', 'Optional')}
                                                            />
                                                        </InputGroup>
                                                    </div>

                                                    <div className="flex gap-2 border-b border-gray-200 pb-6">
                                                        <button
                                                            onClick={() => handleSaveProduct(product)}
                                                            className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors shadow-lg"
                                                        >
                                                            {t('保存', 'Save')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProduct(product.id)}
                                                            className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                                                        >
                                                            {t('删除商品', 'Delete')}
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <h5 className="font-bold text-gray-800 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
                                                            {t('规格', 'Variants')}
                                                        </h5>

                                                        <div className="space-y-3">
                                                            {product.variants.map((v) => (
                                                                <div
                                                                    key={v.id}
                                                                    className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-white border border-gray-200 p-3 rounded-xl shadow-sm"
                                                                >
                                                                    <div className="flex-1 w-full md:w-auto">
                                                                        <StyledInput
                                                                            value={v.display_name_zh}
                                                                            onChange={(e) =>
                                                                                handleVariantChange(product.id, v.id, 'display_name_zh', e.target.value)
                                                                            }
                                                                            placeholder={t('规格名称', 'Variant Name')}
                                                                        />
                                                                    </div>
                                                                    <div className="w-full md:w-32">
                                                                        <StyledSelect
                                                                            value={v.form}
                                                                            onChange={(e) => handleVariantChange(product.id, v.id, 'form', e.target.value)}
                                                                        >
                                                                            {formOptions.map((o) => (
                                                                                <option key={o.value} value={o.value}>
                                                                                    {o.label}
                                                                                </option>
                                                                            ))}
                                                                        </StyledSelect>
                                                                    </div>
                                                                    <div className="w-full md:w-32">
                                                                        <StyledSelect
                                                                            value={v.container}
                                                                            onChange={(e) => handleVariantChange(product.id, v.id, 'container', e.target.value)}
                                                                        >
                                                                            {containerOptions.map((o) => (
                                                                                <option key={o.value} value={o.value}>
                                                                                    {o.label}
                                                                                </option>
                                                                            ))}
                                                                        </StyledSelect>
                                                                    </div>
                                                                    <div className="w-full md:w-24 relative">
                                                                        <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">x</span>
                                                                        <StyledInput
                                                                            className="pl-6"
                                                                            type="number"
                                                                            value={v.conversion_to_base || ''}
                                                                            onChange={(e) =>
                                                                                handleVariantChange(product.id, v.id, 'conversion_to_base', e.target.value)
                                                                            }
                                                                            placeholder="1.0"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => handleSaveVariant(v)}
                                                                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-green-50 text-green-600 transition-colors"
                                                                        >
                                                                            <span className="material-symbols-outlined text-lg">save</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteVariant(product.id, v.id)}
                                                                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-red-50 text-red-600 transition-colors"
                                                                        >
                                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 bg-brand-red/5 border border-dashed border-brand-red/30 p-3 rounded-xl">
                                                                <div className="flex-1 w-full md:w-auto">
                                                                    <StyledInput
                                                                        value={(newVariantByProduct[product.id] || {}).display_name_zh || ''}
                                                                        onChange={(e) =>
                                                                            handleNewVariantChange(product.id, 'display_name_zh', e.target.value)
                                                                        }
                                                                        placeholder={t('新规格名称', 'New Variant')}
                                                                        className="bg-white"
                                                                    />
                                                                </div>
                                                                <div className="w-full md:w-32">
                                                                    <StyledSelect
                                                                        value={(newVariantByProduct[product.id] || {}).form || 'RAW'}
                                                                        onChange={(e) => handleNewVariantChange(product.id, 'form', e.target.value)}
                                                                        className="bg-white"
                                                                    >
                                                                        {formOptions.map((o) => (
                                                                            <option key={o.value} value={o.value}>
                                                                                {o.label}
                                                                            </option>
                                                                        ))}
                                                                    </StyledSelect>
                                                                </div>
                                                                <div className="w-full md:w-32">
                                                                    <StyledSelect
                                                                        value={(newVariantByProduct[product.id] || {}).container || 'bag'}
                                                                        onChange={(e) => handleNewVariantChange(product.id, 'container', e.target.value)}
                                                                        className="bg-white"
                                                                    >
                                                                        {containerOptions.map((o) => (
                                                                            <option key={o.value} value={o.value}>
                                                                                {o.label}
                                                                            </option>
                                                                        ))}
                                                                    </StyledSelect>
                                                                </div>
                                                                <div className="w-full md:w-24">
                                                                    <StyledInput
                                                                        type="number"
                                                                        value={(newVariantByProduct[product.id] || {}).conversion_to_base || ''}
                                                                        onChange={(e) =>
                                                                            handleNewVariantChange(product.id, 'conversion_to_base', e.target.value)
                                                                        }
                                                                        placeholder={t('系数', 'Rate')}
                                                                        className="bg-white"
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => handleCreateVariant(product.id)}
                                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-red text-white shadow-md hover:bg-red-700 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">add</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <aside className="relative">
                <div className="neumorphic-flat rounded-3xl p-6 flex flex-col gap-6 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.3em]">
                            {t('快速新增', 'Quick Add')}
                        </span>
                        <span className="material-symbols-outlined text-gray-400 text-lg">add_circle</span>
                    </div>

                    <h4 className="font-bold text-gray-800">{t('新增商品', 'Add Product')}</h4>

                    <div className="space-y-4">
                        <InputGroup label={t('中文名', 'Chinese')}>
                            <StyledInput
                                value={newProduct.name_zh}
                                onChange={(e) => setNewProduct({ ...newProduct, name_zh: e.target.value })}
                                placeholder={t('例如：鸡胸肉', 'e.g. Chicken Breast')}
                            />
                        </InputGroup>
                        <InputGroup label={t('英文名', 'English')}>
                            <StyledInput
                                value={newProduct.name_en}
                                onChange={(e) => setNewProduct({ ...newProduct, name_en: e.target.value })}
                                placeholder={t('例如：Chicken Breast', 'e.g. Chicken Breast')}
                            />
                        </InputGroup>
                        <InputGroup label={t('分类', 'Category')}>
                            <StyledSelect
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                            >
                                {categoryOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </StyledSelect>
                        </InputGroup>
                        <InputGroup label={t('存储', 'Storage')}>
                            <StyledSelect
                                value={newProduct.storage_type}
                                onChange={(e) => setNewProduct({ ...newProduct, storage_type: e.target.value })}
                            >
                                {storageOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </StyledSelect>
                        </InputGroup>

                        <div className="grid grid-cols-2 gap-3">
                            <InputGroup label={t('整箱数量', 'Case Qty')}>
                                <StyledInput
                                    type="number"
                                    value={newProduct.case_pack}
                                    onChange={(e) => setNewProduct({ ...newProduct, case_pack: e.target.value })}
                                    placeholder="-"
                                />
                            </InputGroup>
                            <InputGroup label={t('最小订购', 'Min Order')}>
                                <StyledInput
                                    type="number"
                                    value={newProduct.min_order_qty}
                                    onChange={(e) => setNewProduct({ ...newProduct, min_order_qty: e.target.value })}
                                    placeholder="-"
                                />
                            </InputGroup>
                        </div>

                        <button
                            className="w-full bg-brand-red hover:bg-red-700 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-red/20 hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-2"
                            onClick={handleCreateProduct}
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            {t('创建商品', 'Create Product')}
                        </button>
                    </div>

                    {message && (
                        <div
                            className={cn(
                                "text-xs font-bold text-center p-3 rounded-xl border",
                                messageIsError ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                            )}
                        >
                            {message}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}

export default Products;

