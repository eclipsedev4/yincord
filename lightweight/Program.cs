using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("Yincord")]
[assembly: AssemblyVersion("2.0.0.0")]

static class Program {
    internal static readonly string DataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "YincordV2Light");
    internal static string TestOutput;
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool SetDllDirectory(string path);
    [STAThread]
    static int Main(string[] args) {
        try {
            if (args.Length == 2 && args[0] == "--smoke-test") {
                TestOutput = Path.GetFullPath(args[1]);
                Directory.CreateDirectory(TestOutput);
            }
            Directory.CreateDirectory(DataRoot);
            AppDomain.CurrentDomain.AssemblyResolve += ResolveSdk;
            // Extract only the small SDK loader, never the browser or UI bundle.
            string loaderDir = Path.Combine(DataRoot, "sdk-1.0.4314.35");
            Directory.CreateDirectory(loaderDir);
            string loader = Path.Combine(loaderDir, "WebView2Loader.dll");
            if (!File.Exists(loader)) {
                using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream("WebView2Loader.dll"))
                using (FileStream output = File.Create(loader)) input.CopyTo(output);
            }
            if (!SetDllDirectory(loaderDir)) throw new InvalidOperationException("Could not locate WebView2 loader.");
            RunUi();
            return Environment.ExitCode;
        } catch (Exception error) {
            Directory.CreateDirectory(DataRoot);
            File.WriteAllText(Path.Combine(DataRoot, "startup-error.txt"), error.ToString());
            if (TestOutput != null) File.WriteAllText(Path.Combine(TestOutput, "error.txt"), error.ToString());
            else MessageBox.Show("Yincord could not start.\n\n" + error.Message, "Yincord");
            return 1;
        }
    }
    static Assembly ResolveSdk(object sender, ResolveEventArgs args) {
        string name = new AssemblyName(args.Name).Name;
        if (name != "Microsoft.Web.WebView2.Core" && name != "Microsoft.Web.WebView2.WinForms") return null;
        using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream(name + ".dll"))
        using (MemoryStream bytes = new MemoryStream()) { input.CopyTo(bytes); return Assembly.Load(bytes.ToArray()); }
    }
    [MethodImpl(MethodImplOptions.NoInlining)]
    static void RunUi() {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new ClientWindow());
    }
}

sealed class ClientWindow : Form {
    const string Origin = "https://app.yincord.local";
    readonly WebView2 view = new WebView2();
    readonly JavaScriptSerializer json = new JavaScriptSerializer();
    readonly List<string> errors = new List<string>();
    internal ClientWindow() {
        Text = "Yincord";
        Width = 1200; Height = 800; MinimumSize = new Size(800, 600);
        BackColor = Color.FromArgb(17, 18, 24);
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        view.Dock = DockStyle.Fill;
        view.DefaultBackgroundColor = BackColor;
        Controls.Add(view);
        Shown += async delegate { await Initialize(); };
    }
    async Task Initialize() {
        try {
            var options = new CoreWebView2EnvironmentOptions();
            options.AdditionalBrowserArguments = "--disk-cache-size=16777216 --media-cache-size=16777216";
            string profile = Program.TestOutput == null ? Path.Combine(Program.DataRoot, "profile") : Path.Combine(Program.TestOutput, "profile");
            var environment = await CoreWebView2Environment.CreateAsync(null, profile, options);
            await view.EnsureCoreWebView2Async(environment);
            view.CoreWebView2.Settings.IsStatusBarEnabled = false;
            view.CoreWebView2.Settings.AreDevToolsEnabled = Program.TestOutput != null;
            view.CoreWebView2.AddWebResourceRequestedFilter(Origin + "/*", CoreWebView2WebResourceContext.All);
            view.CoreWebView2.WebResourceRequested += ServeResource;
            view.CoreWebView2.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs e) {
                e.Handled = true;
                Uri uri;
                if (e.IsUserInitiated && Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) && (uri.Scheme == "https" || uri.Scheme == "http"))
                    Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
            };
            view.CoreWebView2.ProcessFailed += delegate(object sender, CoreWebView2ProcessFailedEventArgs e) { errors.Add(e.ProcessFailedKind.ToString()); };
            view.CoreWebView2.Navigate(Origin + "/login");
            if (Program.TestOutput != null) await VerifyStartup();
        } catch (Exception error) {
            File.WriteAllText(Path.Combine(Program.DataRoot, "startup-error.txt"), error.ToString());
            if (Program.TestOutput != null) {
                File.WriteAllText(Path.Combine(Program.TestOutput, "error.txt"), error.ToString());
                Environment.ExitCode = 1; Close();
            } else MessageBox.Show(this, "Yincord could not start.\n\n" + error.Message, "Yincord");
        }
    }
    void ServeResource(object sender, CoreWebView2WebResourceRequestedEventArgs e) {
        try {
            Uri uri = new Uri(e.Request.Uri);
            string key = Uri.UnescapeDataString(uri.AbsolutePath).TrimStart('/');
            foreach (string part in key.Split('/')) if (part == "..") { Reply(e, null, 400, "text/plain"); return; }
            if (e.Request.Method != "GET" && e.Request.Method != "HEAD") { Reply(e, null, 405, "text/plain"); return; }
            using (Stream bundle = Assembly.GetExecutingAssembly().GetManifestResourceStream("renderer.zip"))
            using (ZipArchive zip = new ZipArchive(bundle, ZipArchiveMode.Read)) {
                ZipArchiveEntry entry = zip.GetEntry(key);
                // Browser routes use the SPA document. Asset/discovery misses remain real 404s.
                if (entry == null && (key.Length == 0 || key == "login" || key == "register" || key.StartsWith("channels/"))) {
                    key = "index.html"; entry = zip.GetEntry(key);
                }
                if (entry == null) { Reply(e, null, 404, "text/plain"); return; }
                MemoryStream content = new MemoryStream();
                if (e.Request.Method == "GET") using (Stream input = entry.Open()) input.CopyTo(content);
                content.Position = 0;
                Reply(e, content, 200, Mime(key));
            }
        } catch (Exception error) { errors.Add(error.Message); Reply(e, null, 500, "text/plain"); }
    }
    void Reply(CoreWebView2WebResourceRequestedEventArgs e, Stream stream, int status, string mime) {
        e.Response = view.CoreWebView2.Environment.CreateWebResourceResponse(stream, status, status == 200 ? "OK" : "Error",
            "Content-Type: " + mime + "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff");
    }
    static string Mime(string key) {
        switch (Path.GetExtension(key).ToLowerInvariant()) {
            case ".html": return "text/html; charset=utf-8";
            case ".js": case ".mjs": return "application/javascript";
            case ".css": return "text/css";
            case ".json": return "application/json";
            case ".wasm": return "application/wasm";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".webp": return "image/webp";
            case ".gif": return "image/gif";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".woff2": return "font/woff2";
            case ".woff": return "font/woff";
            case ".mp3": return "audio/mpeg";
            case ".ogg": return "audio/ogg";
            default: return "application/octet-stream";
        }
    }
    async Task VerifyStartup() {
        bool passed = false;
        string observed = "null";
        for (int attempt = 0; attempt < 60; attempt++) {
            await Task.Delay(1000);
            observed = await view.CoreWebView2.ExecuteScriptAsync("JSON.stringify({title:document.title,text:document.body?.innerText||'',actions:[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0&&!b.disabled).map(b=>b.innerText.trim()).filter(t=>t&&t!=='Skip to content'),secure:isSecureContext})");
            string stateText = json.Deserialize<string>(observed);
            if (stateText == null) continue;
            File.WriteAllText(Path.Combine(Program.TestOutput, "observed-page.json"), stateText);
            var state = json.Deserialize<Dictionary<string, object>>(stateText);
            string title = Convert.ToString(state["title"]), text = Convert.ToString(state["text"]);
            var actions = state["actions"] as System.Collections.ArrayList;
            if (attempt >= 9 && title.StartsWith("Yincord") && text.Length > 20 && actions != null && actions.Count > 0 && Convert.ToBoolean(state["secure"]) && errors.Count == 0) { passed = true; break; }
        }
        using (FileStream shot = File.Create(Path.Combine(Program.TestOutput, "window.png")))
            await view.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, shot);
        File.WriteAllText(Path.Combine(Program.TestOutput, "result.json"), json.Serialize(new { ok = passed, errors = errors, executableBytes = new FileInfo(Application.ExecutablePath).Length }));
        Environment.ExitCode = passed ? 0 : 1;
        Close();
    }
}
