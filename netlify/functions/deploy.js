import axios from "axios";
import FormData from "form-data";

export const handler = async (event) => {
  try {
    // Validasi metode
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const boundary = event.headers["content-type"].split("boundary=")[1];
    const body = Buffer.from(event.body, "base64");
    const parts = body.toString("binary").split(boundary);

    // Ambil domain & file dari FormData (parsing sederhana)
    const domainMatch = parts.find((p) => p.includes('name="domain"'));
    const fileMatch = parts.find((p) => p.includes('name="file"'));

    if (!domainMatch || !fileMatch) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Data tidak lengkap" }),
      };
    }

    const domain = domainMatch.split("\r\n").pop().trim();

    // Simpan data file upload
    const fileStart = fileMatch.indexOf("\r\n\r\n") + 4;
    const fileData = Buffer.from(fileMatch.substring(fileStart), "binary");

    const formData = new FormData();
    formData.append("file", fileData, "upload.zip");

    // 🔑 Masukkan token Netlify kamu di sini
    const NETLIFY_TOKEN = process.env.NETLIFY_API_TOKEN;

    // Buat site baru
    const createSite = await axios.post(
      "https://api.netlify.com/api/v1/sites",
      formData,
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_TOKEN}`,
          ...formData.getHeaders(),
        },
      }
    );

    const siteId = createSite.data.id;

    // Update domain name
    await axios.patch(
      `https://api.netlify.com/api/v1/sites/${siteId}`,
      { name: domain },
      {
        headers: { Authorization: `Bearer ${NETLIFY_TOKEN}` },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: `https://${domain}.netlify.app`,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.response?.data?.message || err.message,
      }),
    };
  }
};
