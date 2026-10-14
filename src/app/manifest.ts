import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vundy POS",
    short_name: "Vundy POS",
    description: "ລະບົບຂາຍໜ້າຮ້ານ ແລະ ຈັດການສະຕ໋ອກ",
    start_url: "/pos",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    icons: [{ src: "/vundy-logo.png", sizes: "any", type: "image/png" }]
  };
}
