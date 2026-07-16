export function orderConfirmationEmail({
  customerName,
  orderNumber,
  trackingUrl,
}: {
  customerName: string;
  orderNumber: string;
  trackingUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{
font-family:Arial,sans-serif;
background:#f3f4f6;
padding:40px;
}

.card{
max-width:650px;
margin:auto;
background:#fff;
border-radius:12px;
padding:40px;
}

.button{
display:inline-block;
padding:14px 28px;
background:#facc15;
color:#000;
text-decoration:none;
border-radius:8px;
font-weight:bold;
}

.footer{
margin-top:40px;
font-size:13px;
color:#777;
}
</style>
</head>

<body>

<div class="card">

<h1>Thank you for your order!</h1>

<p>

Hi <strong>${customerName}</strong>,

</p>

<p>

We've received your order and it's now in our production queue.

</p>

<h2>Order Number</h2>

<p style="font-size:26px;font-weight:bold;">
${orderNumber}
</p>

<p>

You can track your order anytime using the button below.

</p>

<p>

<a
class="button"
href="${trackingUrl}"
>

Track My Order

</a>

</p>

<div class="footer">

Layer Forge

<br>

Ideas Crafted Into Reality

<br><br>

https://www.layerforgecanada.com

</div>

</div>

</body>
</html>
`;
}