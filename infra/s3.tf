resource "aws_s3_bucket" "comprobantes" {
  bucket = "${var.proyecto}-comprobantes-${var.ambiente}"
}

# Postmortem A1: el bucket nunca vuelve a ser publico. Corrige CKV_AWS_53,
# CKV_AWS_54, CKV_AWS_55, CKV_AWS_56 y CKV2_AWS_6 (bloquean segun Decision 1).
resource "aws_s3_bucket_public_access_block" "comprobantes" {
  bucket = aws_s3_bucket.comprobantes.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Solo el rol conciliacion-lectura del proveedor (cuenta 111122223333) puede
# leer comprobantes. Reemplaza Principal = "*" (CKV_AWS_70).
resource "aws_s3_bucket_policy" "conciliacion" {
  bucket = aws_s3_bucket.comprobantes.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "LecturaConciliacion"
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::111122223333:role/conciliacion-lectura" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.comprobantes.arn}/*"
    }]
  })

  # El bloqueo de acceso publico se aplica antes que la politica.
  depends_on = [aws_s3_bucket_public_access_block.comprobantes]
}
