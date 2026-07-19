---
description: Compare complete ALLOW enforcement flows in cURL, JavaScript, and Python.
---

# Complete ALLOW flow

All three examples enforce create → verify → consume → execute.

{% hint style="info" %}
**Primary constraint:** The examples end only after a valid consume receipt; attach the real executor after that check.
{% endhint %}

## Choose a language

<table data-view="cards">
  <thead>
    <tr>
      <th></th>
      <th></th>
      <th data-hidden data-card-target data-type="content-ref"></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>cURL</strong></td>
      <td>Fail-closed shell and jq flow.</td>
      <td><a href="curl.md">curl.md</a></td>
    </tr>
    <tr>
      <td><strong>JavaScript</strong></td>
      <td>Native fetch flow.</td>
      <td><a href="javascript.md">javascript.md</a></td>
    </tr>
    <tr>
      <td><strong>Python</strong></td>
      <td>Standard-library HTTP flow.</td>
      <td><a href="python.md">python.md</a></td>
    </tr>
  </tbody>
</table>
