import { useMemo, useState } from "react";
import {
    PRODUCT_CATALOG,
    SAMPLE_PHARMACIES,
    STOCK_STATUS,
    formatUpdatedAt,
    getProductName,
    priceRange,
    summarizeStock,
} from "../../pharmacyMap/pharmacyData";
// 목록/필터/모달 스타일은 병원·약국(시설) 관리 CSS를 그대로 재사용한다.
import "../facilities/AdminFacilitiesPage.css";
import "./AdminPharmaciesPage.css";

const EMPTY_FORM = {
    name: "",
    address: "",
    phone: "",
    businessHours: "09:00–19:00",
    latitude: "",
    longitude: "",
    isOpen: true,
    active: true,
    partnership: false,
    advertised: false,
    adPriority: "",
    glp1Products: [],
};

let rowKeySeed = 0;
const withKey = (item) => ({ ...item, key: `row-${rowKeySeed++}` });

function toForm(pharmacy) {
    return {
        ...pharmacy,
        adPriority: pharmacy.adPriority ?? "",
        glp1Products: pharmacy.glp1Products.map(withKey),
    };
}

/* 저장 전 검증 — 문제 없으면 null. */
function validate(form) {
    if (!form.name.trim() || !form.address.trim()) return "약국명과 주소를 입력해 주세요.";
    if (Number.isNaN(Number(form.latitude)) || form.latitude === "" || Number.isNaN(Number(form.longitude)) || form.longitude === "") {
        return "위도와 경도를 숫자로 입력해 주세요.";
    }
    if (form.advertised && !(Number(form.adPriority) >= 1)) return "광고 약국은 우선순위(1 이상)가 필요합니다.";

    const seen = new Set();

    for (const item of form.glp1Products) {
        if (!item.dose.trim()) return "용량이 비어 있는 GLP-1 항목이 있습니다.";
        if (!(Number(item.price) >= 0)) return "가격은 0 이상의 숫자여야 합니다.";

        const id = `${item.product}|${item.dose.trim().toLowerCase()}`;

        if (seen.has(id)) return `${getProductName(item.product)} ${item.dose} 용량이 중복되었습니다.`;
        seen.add(id);
    }

    return null;
}

/* GLP-1 편집기 — product별 그룹, 그룹마다 용량 행(용량/재고/가격/삭제)을 배열로 관리한다. */
function Glp1Editor({ items, onChange }) {
    const products = [...new Set(items.map((item) => item.product))];
    const addable = PRODUCT_CATALOG.filter(({ product }) => !products.includes(product));

    const addRow = (product) =>
        onChange([...items, withKey({ product, dose: "", stockStatus: "IN_STOCK", price: 0 })]);
    const updateRow = (key, patch) =>
        onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
    const removeRow = (key) => onChange(items.filter((item) => item.key !== key));

    return (
        <fieldset className="admin-glp1-editor">
            <legend>GLP-1 취급 정보 (샘플)</legend>

            {products.length === 0 && <p className="admin-glp1-empty">등록된 제품이 없습니다.</p>}

            {products.map((product) => (
                <div key={product} className="admin-glp1-group">
                    <h4>{getProductName(product)}</h4>

                    {items.filter((item) => item.product === product).map((item) => (
                        <div key={item.key} className="admin-glp1-row">
                            <input
                                aria-label={`${getProductName(product)} 용량`}
                                placeholder="용량 (예: 0.5mg)"
                                value={item.dose}
                                onChange={(event) => updateRow(item.key, { dose: event.target.value })}
                            />
                            <select
                                aria-label={`${getProductName(product)} 재고 상태`}
                                value={item.stockStatus}
                                onChange={(event) => updateRow(item.key, { stockStatus: event.target.value })}
                            >
                                {Object.entries(STOCK_STATUS).map(([value, { label }]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                            <input
                                aria-label={`${getProductName(product)} 가격`}
                                type="number"
                                min="0"
                                step="1000"
                                value={item.price}
                                onChange={(event) => updateRow(item.key, { price: event.target.value })}
                            />
                            <button type="button" onClick={() => removeRow(item.key)}>삭제</button>
                        </div>
                    ))}

                    <button type="button" className="admin-glp1-add" onClick={() => addRow(product)}>
                        + 용량 추가
                    </button>
                </div>
            ))}

            {addable.length > 0 && (
                <div className="admin-glp1-add-product">
                    <span>제품 추가</span>
                    {addable.map(({ product, displayName }) => (
                        <button key={product} type="button" className="admin-glp1-add" onClick={() => addRow(product)}>
                            + {displayName}
                        </button>
                    ))}
                </div>
            )}
        </fieldset>
    );
}

export default function AdminPharmaciesPage() {
    // dummy phase: 메모리 state만 사용(새로고침하면 샘플로 복귀). API 연동 시 이 state를 서버 호출로 교체.
    const [pharmacies, setPharmacies] = useState(SAMPLE_PHARMACIES);
    const [keyword, setKeyword] = useState("");
    const [activeFilter, setActiveFilter] = useState("");
    const [editing, setEditing] = useState(null); // { id: number|null, form }
    const [formError, setFormError] = useState("");

    const visible = useMemo(() => {
        const kw = keyword.trim().toLowerCase();

        return pharmacies.filter((item) =>
            (!kw || `${item.name} ${item.address}`.toLowerCase().includes(kw))
            && (!activeFilter || String(item.active) === activeFilter)
        );
    }, [pharmacies, keyword, activeFilter]);

    const closeModal = () => {
        setEditing(null);
        setFormError("");
    };

    const setField = (name, value) =>
        setEditing((current) => ({ ...current, form: { ...current.form, [name]: value } }));

    const handleSave = (event) => {
        event.preventDefault();

        const error = validate(editing.form);

        if (error) {
            setFormError(error);
            return;
        }

        const { form } = editing;
        const saved = {
            ...form,
            name: form.name.trim(),
            address: form.address.trim(),
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            adPriority: form.advertised ? Number(form.adPriority) : null,
            glp1Products: form.glp1Products.map(({ product, dose, stockStatus, price }) => ({
                product,
                displayName: getProductName(product),
                dose: dose.trim(),
                stockStatus,
                price: Number(price),
            })),
            updatedAt: new Date().toISOString(),
        };

        setPharmacies((current) =>
            editing.id === null
                ? [...current, { ...saved, id: Math.max(0, ...current.map((item) => item.id)) + 1 }]
                : current.map((item) => (item.id === editing.id ? { ...saved, id: editing.id } : item))
        );
        closeModal();
    };

    const form = editing?.form;

    return (
        <div className="admin-facilities-page">
            <div className="admin-facilities-heading">
                <div>
                    <span>PHARMACY MANAGEMENT</span>
                    <h1>약국 관리</h1>
                    <p>약국 기본 정보, 제휴·광고, GLP-1 재고와 가격을 관리합니다.</p>
                </div>

                <div className="admin-facilities-heading-actions">
                    <div className="admin-facilities-count">
                        <span>전체 약국</span>
                        <strong>{pharmacies.length}곳</strong>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEditing({ id: null, form: { ...EMPTY_FORM, glp1Products: [] } })}
                    >
                        약국 등록
                    </button>
                </div>
            </div>

            <div className="admin-pharmacy-notice" role="note">
                샘플 데이터 화면입니다. 수정 내용은 이 브라우저 탭의 메모리에만 반영되며 서버에 저장되지 않습니다.
            </div>

            <form className="admin-facilities-filter" onSubmit={(event) => event.preventDefault()}>
                <input
                    aria-label="약국 검색"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="약국명 또는 주소 검색"
                />
                <select aria-label="활성 상태" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
                    <option value="">전체 상태</option>
                    <option value="true">활성</option>
                    <option value="false">비활성</option>
                </select>
                <button
                    type="button"
                    className="admin-facilities-reset"
                    onClick={() => {
                        setKeyword("");
                        setActiveFilter("");
                    }}
                >
                    초기화
                </button>
            </form>

            <div className="admin-facilities-table-card">
                {visible.length === 0 ? (
                    <div className="admin-facilities-state">
                        <strong>조회된 약국이 없습니다.</strong>
                    </div>
                ) : (
                    <div className="admin-facilities-table-wrapper">
                        <table className="admin-facilities-table">
                            <thead>
                                <tr>
                                    <th>약국</th>
                                    <th>전화번호</th>
                                    <th>상태</th>
                                    <th>제휴</th>
                                    <th>광고 (우선순위)</th>
                                    {PRODUCT_CATALOG.map(({ product, displayName }) => (
                                        <th key={product}>{displayName} 재고 · 가격</th>
                                    ))}
                                    <th>최근 수정</th>
                                    <th>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((pharmacy) => (
                                    <tr key={pharmacy.id}>
                                        <td>
                                            <div className="admin-facility-name">
                                                <div>
                                                    <strong>{pharmacy.name}</strong>
                                                    <small className="admin-facility-address">{pharmacy.address}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{pharmacy.phone || "-"}</td>
                                        <td>
                                            <span className={`admin-facility-status admin-facility-status--${pharmacy.active ? "approved" : "rejected"}`}>
                                                {pharmacy.active ? "활성" : "비활성"}
                                            </span>
                                        </td>
                                        <td>{pharmacy.partnership ? "제휴" : "-"}</td>
                                        <td>{pharmacy.advertised ? `광고 (${pharmacy.adPriority})` : "-"}</td>
                                        {PRODUCT_CATALOG.map(({ product }) => {
                                            const status = summarizeStock(pharmacy, product);

                                            return (
                                                <td key={product}>
                                                    {status ? (
                                                        <>
                                                            {STOCK_STATUS[status].label}
                                                            <small className="admin-pharmacy-sub">{priceRange(pharmacy, product) ?? "가격 미등록"}</small>
                                                        </>
                                                    ) : "미취급"}
                                                </td>
                                            );
                                        })}
                                        <td>{formatUpdatedAt(pharmacy.updatedAt)}</td>
                                        <td>
                                            <div className="admin-facility-actions">
                                                <button type="button" onClick={() => setEditing({ id: pharmacy.id, form: toForm(pharmacy) })}>
                                                    수정
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editing && (
                <div className="admin-facility-modal-backdrop">
                    <form
                        className="admin-facility-modal admin-facility-create-modal admin-pharmacy-modal"
                        onSubmit={handleSave}
                        role="dialog"
                        aria-modal="true"
                        aria-label="약국 정보 편집"
                    >
                        <header>
                            <div>
                                <span>{editing.id === null ? "CREATE PHARMACY" : "EDIT PHARMACY"}</span>
                                <h2>{editing.id === null ? "약국 등록" : "약국 정보 수정"}</h2>
                            </div>
                            <button type="button" aria-label="닫기" onClick={closeModal}>×</button>
                        </header>

                        <div className="admin-facility-create-grid">
                            <label className="wide">
                                <span>약국명 *</span>
                                <input value={form.name} onChange={(event) => setField("name", event.target.value)} />
                            </label>
                            <label className="wide">
                                <span>주소 *</span>
                                <input value={form.address} onChange={(event) => setField("address", event.target.value)} />
                            </label>
                            <label>
                                <span>전화번호</span>
                                <input value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
                            </label>
                            <label>
                                <span>영업시간</span>
                                <input value={form.businessHours} onChange={(event) => setField("businessHours", event.target.value)} />
                            </label>
                            <label>
                                <span>위도 *</span>
                                <input type="number" step="any" value={form.latitude} onChange={(event) => setField("latitude", event.target.value)} />
                            </label>
                            <label>
                                <span>경도 *</span>
                                <input type="number" step="any" value={form.longitude} onChange={(event) => setField("longitude", event.target.value)} />
                            </label>
                        </div>

                        <div className="admin-pharmacy-toggles">
                            {[
                                ["active", "활성"],
                                ["isOpen", "현재 영업 중"],
                                ["partnership", "제휴 약국"],
                                ["advertised", "광고 약국"],
                            ].map(([name, label]) => (
                                <label key={name}>
                                    <input
                                        type="checkbox"
                                        checked={form[name]}
                                        onChange={(event) => setField(name, event.target.checked)}
                                    />
                                    {label}
                                </label>
                            ))}
                            {form.advertised && (
                                <label className="admin-pharmacy-priority">
                                    광고 우선순위
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.adPriority}
                                        onChange={(event) => setField("adPriority", event.target.value)}
                                    />
                                </label>
                            )}
                        </div>

                        <Glp1Editor items={form.glp1Products} onChange={(items) => setField("glp1Products", items)} />

                        {formError && <p className="admin-pharmacy-error" role="alert">{formError}</p>}

                        <div className="admin-facility-modal-actions">
                            <button type="button" onClick={closeModal}>취소</button>
                            <button type="submit">저장</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
