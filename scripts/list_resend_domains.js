
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// Found in Railway Dashboard
const resend = new Resend("re_yUNVSmWK_HjGruotTNRoQmAFLzSNkoVjV");

async function listDomains() {
    console.log("Listing Resend Domains...");
    try {
        const data = await resend.domains.list();
        console.log("Domains:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("List Failed:", error);
    }
}

listDomains();
