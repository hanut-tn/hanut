-- Restreindre les policies Storage upload/update/delete au dossier du vendeur.
-- Convention de path : product-images/{seller_id}/{filename}
-- get_seller_id() est utilisé au lieu de auth.uid() pour couvrir les membres d'équipe
-- (qui uploadent vers le dossier du vendeur, pas leur propre UID).

DROP POLICY IF EXISTS "product_images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "product_images_seller_upload" ON storage.objects;
DROP POLICY IF EXISTS "product_images_seller_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_seller_delete" ON storage.objects;

-- INSERT : seul le vendeur (ou ses membres d'équipe) peut uploader dans son dossier
CREATE POLICY "product_images_seller_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_seller_id()::text
);

-- UPDATE : idem
CREATE POLICY "product_images_seller_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_seller_id()::text
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_seller_id()::text
);

-- DELETE : idem
CREATE POLICY "product_images_seller_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = public.get_seller_id()::text
);

-- SELECT : lecture publique conservée (bucket public = true, liens partagés)
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');
