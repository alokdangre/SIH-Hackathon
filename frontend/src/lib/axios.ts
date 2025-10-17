import axios from "axios";

const api = axios.create({
    baseURL: "http://128.0.0.1:8000",
});

export default api;