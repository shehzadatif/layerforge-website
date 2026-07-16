export function OrderConfirmationEmail(
  customerName: string,
  orderNumber: string,
  trackingUrl: string
) {
  return `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8" />

<style>

body{
margin:0;
padding:40px;
background:#f5f5f5;
font-family:Arial,Helvetica,sans-serif;
}

.container{
max-width:650px;
margin:auto;
background:white;
border-radius:12px;
overflow:hidden;
}

.header{
background:#111827;
padding:30px;
text-align:center;
}

.header h1{
color:#facc15;
margin:0;
}

.content{
padding:40px;
}

.button{
display:inline-block;
padding:14px 24px;
background:#facc15;
color:black;
font-weight:bold;
text-decoration:none;
border-radius:8px;
}

.footer{
margin-top:40px;
padding:30px;
background:#f3f4f6;
font-size:14px;
color:#666;
text-align:center;
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>Layer Forge</h1>

<p style="color:white;margin-top:10px;">
Ideas Crafted Into Reality
</p>

</div>

<div class="content">

<h2>Thank you for your order!</h2>

<p>

Hello ${customerName},

</p>

<p>

We've received your order and it's now in our production queue.

</p>

<h3>

Order Number

</h3>

<p style="font-size:28px;font-weight:bold;">

${orderNumber}

</p>

<p>

Track your order anytime.

</p>

<p>

<a
href="${trackingUrl}"
class="button"
>

Track My Order

</a>

</p>

</div>

<div class="footer">

www.layerforgecanada.com

</div>

</div>

</body>

</html>
`;
}