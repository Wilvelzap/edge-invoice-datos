// Sistema de autenticación simple
function checkAuth() {
    const authToken = localStorage.getItem('edgeAuthToken');
    const authTime = localStorage.getItem('edgeAuthTime');

    if (!authToken || !authTime) {
        redirectToLogin();
        return false;
    }

    // Verificar si la sesión ha expirado
    const sessionDuration = AUTH_CONFIG.sessionDuration * 60 * 60 * 1000; // Convertir horas a milisegundos
    const currentTime = new Date().getTime();
    const loginTime = parseInt(authTime);

    if (currentTime - loginTime > sessionDuration) {
        // Sesión expirada
        logout();
        return false;
    }

    return true;
}

function login(password) {
    if (password === AUTH_CONFIG.accessPassword) {
        // Guardar token de autenticación
        const token = btoa(password + ':' + new Date().getTime());
        localStorage.setItem('edgeAuthToken', token);
        localStorage.setItem('edgeAuthTime', new Date().getTime().toString());
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem('edgeAuthToken');
    localStorage.removeItem('edgeAuthTime');
    redirectToLogin();
}

function redirectToLogin() {
    if (window.location.pathname.indexOf('login.html') === -1) {
        window.location.href = 'login.html';
    }
}

// Verificar autenticación al cargar la página
if (typeof AUTH_CONFIG !== 'undefined') {
    // Solo verificar si no estamos en la página de login
    if (window.location.pathname.indexOf('login.html') === -1) {
        checkAuth();
    }
}
