import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance.js";
import "./DoctorPatientListPage.css";

export default function DoctorPatientListPage() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const res = await axiosInstance.get("/doctor/dashboard/patients");
                setPatients(res.data);
            } catch (err) {
                console.error("환자 목록 로드 실패", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    const formatGender = (gender) => {
        if (!gender) return "미기재";
        const upper = gender.toUpperCase();
        if (upper === "MALE" || upper === "M") return "남성";
        if (upper === "FEMALE" || upper === "F") return "여성";
        return gender;
    };

    return (
        <section className="patient-list-page">
            <header className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← 대시보드로 돌아가기</button>
                <h1>나의 환자 목록</h1>
                <p>의사 코드를 등록하여 매칭된 전체 환자 목록입니다.</p>
            </header>

            {loading ? (
                <div className="loading-state">데이터를 불러오는 중입니다...</div>
            ) : patients.length === 0 ? (
                <div className="empty-state">
                    <span></span>
                    <p>아직 코드를 등록한 환자가 없습니다.</p>
                </div>
            ) : (
                <div className="patient-grid">
                    {patients.map(patient => (
                        <div key={patient.id} className="patient-card">
                            <div className="patient-info">
                                <div className="patient-avatar"></div>
                                <div>
                                    <h3>{patient.nickname}</h3>
                                    <span>{patient.age}세 / {formatGender(patient.gender)}</span>
                                    <p className="patient-email">{patient.email}</p>
                                </div>
                            </div>
                            <div className="patient-actions">
                                <button onClick={() => navigate("/doctor/patients")}>
                                    리포트 수신함 가기
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}