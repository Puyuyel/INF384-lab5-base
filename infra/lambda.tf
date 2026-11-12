resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.proyecto}-api-${var.ambiente}"
  retention_in_days = 7
}

resource "aws_lambda_function" "api" {
  function_name = "${var.proyecto}-api-${var.ambiente}"
  role          = aws_iam_role.api.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.api.repository_url}:${var.version_imagen}"
  timeout       = 10
  memory_size   = 256

  # Control compensatorio de la excepcion CKV_AWS_258 (Decision 3): limita
  # cuantas invocaciones simultaneas puede recibir la Function URL sin auth.
  reserved_concurrent_executions = 10

  environment {
    variables = {
      BUCKET_COMPROBANTES = aws_s3_bucket.comprobantes.bucket
    }
  }

  lifecycle {
    ignore_changes = [image_uri]
  }

  depends_on = [aws_cloudwatch_log_group.api]
}

resource "aws_lambda_function_url" "api" {
  # EXCEPCION CKV_AWS_258 (DECISIONES.md, Decision 3)
  # Responsable: Lider tecnico
  # Vencimiento: 2026-12-12
  # Control compensatorio: reserved_concurrent_executions = 10 en aws_lambda_function.api
  # Riesgo aceptado: cualquiera con la URL puede invocar la API sin autenticarse, incluido POST /transferir
  #checkov:skip=CKV_AWS_258:La app movil consume la Function URL sin firma IAM; excepcion temporal hasta 2026-12-12
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
}
