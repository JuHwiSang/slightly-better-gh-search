import { env } from "$env/dynamic/public";
import { FunctionRegion } from "@supabase/supabase-js";

const REGION_MAP: Record<string, FunctionRegion> = {
    "ap-northeast-1": FunctionRegion.ApNortheast1,
    "ap-northeast-2": FunctionRegion.ApNortheast2,
    "ap-southeast-1": FunctionRegion.ApSoutheast1,
    "eu-west-1": FunctionRegion.EuWest1,
    "eu-west-2": FunctionRegion.EuWest2,
    "eu-west-3": FunctionRegion.EuWest3,
    "eu-central-1": FunctionRegion.EuCentral1,
    "us-east-1": FunctionRegion.UsEast1,
    "us-west-1": FunctionRegion.UsWest1,
    "sa-east-1": FunctionRegion.SaEast1,
    "ap-south-1": FunctionRegion.ApSouth1,
};

const DEFAULT_REGION = FunctionRegion.ApNortheast2;

export const edgeFunctionRegion: FunctionRegion =
    REGION_MAP[env.PUBLIC_SUPABASE_FUNCTIONS_REGION ?? ""] ?? DEFAULT_REGION;
