import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

export default function DropZone() {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: {
      "application/octet-stream": [".stl", ".3mf"],
    },
    onDrop,
  });

  return (
   <div
  {...getRootProps()}
  className={`mt-8 min-h-[350px] rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition flex flex-col justify-center ${
    isDragActive
      ? "border-yellow-400 bg-yellow-50"
      : "border-slate-300 hover:border-yellow-300"
  }`}
>
      <input {...getInputProps()} />

      <div className="flex flex-col items-center">

  <UploadCloud
    size={64}
    className="mb-6 text-yellow-500"
  />

  <h3 className="text-3xl font-bold text-slate-900">
    Upload Your 3D Model
  </h3>

  <p className="mt-3 text-lg text-slate-600">
    Drag & drop your STL or 3MF file here
  </p>

  <p className="mt-2 text-slate-500">
    or click to browse your computer
  </p>

  <div className="mt-6 rounded-full bg-slate-100 px-5 py-2 text-sm font-medium text-slate-600">
    Supports: STL • 3MF
  </div>

</div>

      {file && (
        <div className="mt-8 rounded-2xl bg-slate-100 p-6 text-left">
          <h4 className="text-lg font-bold text-slate-900">
            ✓ File Uploaded Successfully
          </h4>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">File Name</p>
              <p className="font-semibold">{file.name}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">File Size</p>
              <p className="font-semibold">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">File Type</p>
              <p className="font-semibold">
                {file.name.split(".").pop()?.toUpperCase()}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Status</p>
              <p className="font-semibold text-green-600">
                Ready for Analysis
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}