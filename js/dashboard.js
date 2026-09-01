// =====================================
// DASHBOARD
// =====================================


// =====================================
// SAMPLE DATA
// Used as a fallback while /api/dashboard/stats
// isn't connected yet. Once your backend is live,
// this is only used if the request fails.
// =====================================

const dashboardSampleStats = {

    totalUsers: 12540,

    activePlans: 8,

    totalDeposits: 850000,

    totalWithdrawals: 320500

};



// =====================================
// FORMAT HELPERS
// =====================================

function formatNumber(value){

    return Number(value).toLocaleString("en-US");

}


function formatCurrency(value){

    return "M " + formatNumber(value);

}



// =====================================
// RENDER STATS INTO THE CARDS
// =====================================

function renderDashboardStats(stats){

    document.getElementById("statTotalUsers").textContent =
        formatNumber(stats.totalUsers);

    document.getElementById("statActivePlans").textContent =
        formatNumber(stats.activePlans);

    document.getElementById("statTotalDeposits").textContent =
        formatCurrency(stats.totalDeposits);

    document.getElementById("statTotalWithdrawals").textContent =
        formatCurrency(stats.totalWithdrawals);

}



// =====================================
// LOAD STATS FROM BACKEND
// =====================================

function loadDashboardStats(){

    sb.rpc("get_dashboard_stats")

        .then(({ data, error }) => {

            if(error){

                throw error;

            }

            const row = data[0];

            renderDashboardStats({
                totalUsers: row.total_users,
                activePlans: row.active_plans,
                totalDeposits: row.total_deposits,
                totalWithdrawals: row.total_withdrawals
            });

        })

        .catch(error => {

            console.warn(
                "Dashboard stats request failed, using sample data:",
                error
            );

            renderDashboardStats(dashboardSampleStats);

        });

}



// =====================================
// INIT DASHBOARD
// =====================================

function initDashboard(){

    console.log("Dashboard initialized");

    loadDashboardStats();

}
