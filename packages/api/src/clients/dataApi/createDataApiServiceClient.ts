import { type PartialMessage } from '@bufbuild/protobuf'
import { type PromiseClient } from '@connectrpc/connect'
import { type DataApiService } from '@uniswap/client-data-api/dist/data/v1/api_connect'
import type {
  ListTopPoolsRequest,
  ListTopPoolsResponse,
  ListTopTokensRequest,
  ListTopTokensResponse,
} from '@uniswap/client-data-api/dist/data/v1/api_pb'

export interface DataApiServiceClientContext {
  rpcClient: PromiseClient<typeof DataApiService>
}

export interface DataApiServiceClient {
  listTopTokens: (params: PartialMessage<ListTopTokensRequest>) => Promise<ListTopTokensResponse>
  listTopPools: (params: PartialMessage<ListTopPoolsRequest>) => Promise<ListTopPoolsResponse>
}

export function createDataApiServiceClient({ rpcClient }: DataApiServiceClientContext): DataApiServiceClient {
  return {
    listTopTokens: (params): Promise<ListTopTokensResponse> => rpcClient.listTopTokens(params),
    listTopPools: (params): Promise<ListTopPoolsResponse> => rpcClient.listTopPools(params),
  }
}
