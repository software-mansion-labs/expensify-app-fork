#import <XCTest/XCTest.h>
#import "ApplePushProvisioning.h"
#import <PassKit/PassKit.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>

@interface ApplePushProvisioningTests : XCTestCase
@property (nonatomic, strong) ApplePushProvisioning *module;
@property (nonatomic, strong) RCTBridge *bridge;
@end

@implementation ApplePushProvisioningTests

- (void)setUp {
    [super setUp];
    self.bridge = [[RCTBridge alloc] initWithBundleURL:nil moduleProvider:nil launchOptions:nil];
    self.module = [[ApplePushProvisioning alloc] initWithBridge:self.bridge];
}

- (void)tearDown {
    self.module = nil;
    self.bridge = nil;
    [super tearDown];
}

- (void)testCanAddPaymentPass {
    XCTestExpectation *expectation = [self expectationWithDescription:@"Testing canAddPaymentPass"];
    [self.module canAddPaymentPass:^(id result) {
        XCTAssertNotNil(result);
        XCTAssertTrue([result boolValue]);
        [expectation fulfill];
    } rejector:^(NSString *code, NSString *message, NSError *error) {
        XCTFail(@"Error: %@", message);
        [expectation fulfill];
    }];
    [self waitForExpectationsWithTimeout:5 handler:nil];
}

- (void)testStartAddPaymentPass {
    XCTestExpectation *expectation = [self expectationWithDescription:@"Testing startAddPaymentPass"];
    [self.module startAddPaymentPass:@"1234" cardHolderName:@"John Doe" resolver:^(id result) {
        XCTAssertNil(result);
        [expectation fulfill];
    } rejector:^(NSString *code, NSString *message, NSError *error) {
        XCTFail(@"Error: %@", message);
        [expectation fulfill];
    }];
    [self waitForExpectationsWithTimeout:5 handler:nil];
}

@end
