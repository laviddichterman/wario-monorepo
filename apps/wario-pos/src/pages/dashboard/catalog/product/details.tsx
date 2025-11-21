import { CONFIG } from '@/config';

// ----------------------------------------------------------------------

const metadata = { title: `Product details | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  // const { id = '' } = useParams();

  // const { product, productLoading, productError } = useGetProduct(id);

  return (
    <>
      <title>{metadata.title}</title>

      {/* <ProductDetailsView product={product} loading={productLoading} error={productError} /> */}
    </>
  );
}
