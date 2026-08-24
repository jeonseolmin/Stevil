import axiosInstance from "./axiosInstance";

export async function getAdminReports({
                                          page = 0,
                                          size = 20,
                                          status = "",
                                          targetType = "",
                                          category = "",
                                      } = {}) {
    const response = await axiosInstance.get("/admin/reports", {
        params: {
            page,
            size,
            sort: "createdAt,desc",
            ...(status && { status }),
            ...(targetType && { targetType }),
            ...(category && { category }),
        },
    });

    return response.data;
}

export async function getAdminReport(reportId) {
    const response = await axiosInstance.get(
        `/admin/reports/${reportId}`
    );

    return response.data;
}

export async function startReportReview(reportId) {
    const response = await axiosInstance.patch(
        `/admin/reports/${reportId}/review`
    );

    return response.data;
}

export async function resolveReport(
    reportId,
    action,
    adminNote
) {
    const response = await axiosInstance.patch(
        `/admin/reports/${reportId}/resolve`,
        {
            action,
            adminNote,
        }
    );

    return response.data;
}

export async function dismissReport(reportId, adminNote) {
    const response = await axiosInstance.patch(
        `/admin/reports/${reportId}/dismiss`,
        {
            adminNote,
        }
    );

    return response.data;
}