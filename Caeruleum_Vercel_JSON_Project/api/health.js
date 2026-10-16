export default {
  fetch() {
    return new Response(JSON.stringify({
      success: true,
      message: 'Caeruleum Vercel demo is deployed. App data is stored in each visitor browser.',
      data: {
        storageMode: 'browser-local-json',
        database: false,
        emailDelivery: false,
        realPayments: false
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
