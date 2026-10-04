package com.azzams.system;

import android.app.Activity;
import android.app.Dialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(15, 17, 21));
        getWindow().setNavigationBarColor(Color.rgb(15, 17, 21));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);
        configureWebView(webView, false, null);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void configureWebView(final WebView view, boolean popup, Dialog popupDialog) {
        WebSettings s = view.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        view.addJavascriptInterface(new AndroidBridge(view), "AndroidBridge");

        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();

                if ("file".equals(scheme) || "about".equals(scheme)) return false;

                if ("tel".equals(scheme) || "mailto".equals(scheme) || "sms".equals(scheme)) {
                    openExternal(uri);
                    return true;
                }

                if ("http".equals(scheme) || "https".equals(scheme)) {
                    openExternal(uri);
                    if (popupDialog != null) popupDialog.dismiss();
                    return true;
                }

                openExternal(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                super.onPageFinished(v, url);
                injectNativePrint(v);
            }
        });

        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = filePathCallback;
                try {
                    Intent intent = fileChooserParams.createIntent();
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    fileChooserCallback = null;
                    Toast.makeText(MainActivity.this, "تعذر فتح اختيار الملفات", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }

            @Override
            public boolean onCreateWindow(
                    WebView parent,
                    boolean isDialog,
                    boolean isUserGesture,
                    android.os.Message resultMsg) {
                final Dialog dialog = new Dialog(MainActivity.this);
                dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

                final WebView child = new WebView(MainActivity.this);
                configureWebView(child, true, dialog);

                dialog.setContentView(
                        child,
                        new ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT));

                dialog.setOnDismissListener(d -> child.destroy());
                dialog.show();

                if (dialog.getWindow() != null) {
                    dialog.getWindow().setLayout(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT);
                }

                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(child);
                resultMsg.sendToTarget();
                return true;
            }
        });

        view.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url == null || !url.startsWith("http")) {
                Toast.makeText(
                        MainActivity.this,
                        "تحميل الملف من داخل التطبيق غير مدعوم لهذا النوع",
                        Toast.LENGTH_LONG).show();
                return;
            }

            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimeType);
                req.addRequestHeader("User-Agent", userAgent);
                req.setNotificationVisibility(
                        DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS,
                        "azzams-download");

                DownloadManager dm =
                        (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                dm.enqueue(req);
                Toast.makeText(MainActivity.this, "بدأ التحميل", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                openExternal(Uri.parse(url));
            }
        });
    }

    private void injectNativePrint(WebView v) {
        String js =
                "(function(){"
                + "window.print=function(){try{AndroidBridge.printPage();}catch(e){}};"
                + "document.documentElement.classList.add('android-apk');"
                + "})();";
        v.evaluateJavascript(js, null);
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception e) {
            Toast.makeText(
                    this,
                    "لا يوجد تطبيق لفتح الرابط",
                    Toast.LENGTH_SHORT).show();
        }
    }

    private class AndroidBridge {
        private final WebView printableView;

        AndroidBridge(WebView printableView) {
            this.printableView = printableView;
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(() -> {
                try {
                    PrintManager printManager =
                            (PrintManager) getSystemService(Context.PRINT_SERVICE);

                    PrintDocumentAdapter adapter =
                            printableView.createPrintDocumentAdapter("Azzams_Label");

                    PrintAttributes attrs =
                            new PrintAttributes.Builder()
                                    .setMediaSize(
                                            PrintAttributes.MediaSize.NA_INDEX_4X6.asLandscape())
                                    .setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME)
                                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                    .build();

                    printManager.print("Azzams Label", adapter, attrs);
                } catch (Exception e) {
                    Toast.makeText(
                            MainActivity.this,
                            "تعذر فتح الطباعة",
                            Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST && fileChooserCallback != null) {
            Uri[] results = null;

            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] =
                                data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }

            fileChooserCallback.onReceiveValue(results);
            fileChooserCallback = null;
        }
    }

    private void performDefaultBack() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            MainActivity.super.onBackPressed();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }

        webView.evaluateJavascript(
                "(function(){try{return !!(window.__azzamsHandleAndroidBack && window.__azzamsHandleAndroidBack());}catch(e){return false;}})();",
                value -> {
                    if ("true".equals(value)) return;
                    performDefaultBack();
                });
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
